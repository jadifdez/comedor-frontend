import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Hijo {
  nombre: string;
  curso: string;
}

interface Parent {
  nombre: string;
  email: string;
  telefono: string;
  hijos: Hijo[];
}

interface ImportRequest {
  parents: Parent[];
}

interface ImportResult {
  success: boolean;
  details: {
    padresCreated: number;
    hijosCreated: number;
    errors: string[];
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { parents }: ImportRequest = await req.json();

    if (!parents || !Array.isArray(parents) || parents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No parent data provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const errors: string[] = [];
    let padresCreated = 0;
    let hijosCreated = 0;

    const { data: gradosData, error: gradosError } = await supabase
      .from("grados")
      .select("id, nombre");

    if (gradosError) {
      throw new Error(`Error fetching grados: ${gradosError.message}`);
    }

    const gradosMap = new Map<string, string>();
    gradosData?.forEach((grado: { id: string; nombre: string }) => {
      gradosMap.set(grado.nombre, grado.id);
    });

    for (const parent of parents) {
      try {
        if (!parent.email || !parent.nombre) {
          errors.push(`Parent missing required fields: ${JSON.stringify(parent)}`);
          continue;
        }

        const { data: existingPadre, error: checkError } = await supabase
          .from("padres")
          .select("id")
          .eq("email", parent.email)
          .maybeSingle();

        if (checkError) {
          errors.push(`Error checking existing parent ${parent.email}: ${checkError.message}`);
          continue;
        }

        let padreId: string;

        if (existingPadre) {
          padreId = existingPadre.id;
        } else {
          const { data: newPadre, error: padreError } = await supabase
            .from("padres")
            .insert({
              email: parent.email,
              nombre: parent.nombre,
              telefono: parent.telefono || null,
              activo: true,
              es_personal: false,
            })
            .select("id")
            .single();

          if (padreError) {
            errors.push(`Error creating parent ${parent.email}: ${padreError.message}`);
            continue;
          }

          padreId = newPadre.id;
          padresCreated++;
        }

        for (const hijo of parent.hijos) {
          try {
            const gradoId = gradosMap.get(hijo.curso);

            if (!gradoId) {
              errors.push(`Course not found: ${hijo.curso} for student ${hijo.nombre}`);
              continue;
            }

            const { data: existingHijo, error: hijoCheckError } = await supabase
              .from("hijos")
              .select("id")
              .eq("nombre", hijo.nombre)
              .eq("padre_id", padreId)
              .maybeSingle();

            if (hijoCheckError) {
              errors.push(`Error checking existing student ${hijo.nombre}: ${hijoCheckError.message}`);
              continue;
            }

            if (!existingHijo) {
              const { error: hijoError } = await supabase
                .from("hijos")
                .insert({
                  nombre: hijo.nombre,
                  grado_id: gradoId,
                  padre_id: padreId,
                  activo: true,
                });

              if (hijoError) {
                errors.push(`Error creating student ${hijo.nombre}: ${hijoError.message}`);
                continue;
              }

              hijosCreated++;
            }
          } catch (hijoError) {
            errors.push(`Error processing student ${hijo.nombre}: ${hijoError instanceof Error ? hijoError.message : 'Unknown error'}`);
          }
        }
      } catch (parentError) {
        errors.push(`Error processing parent ${parent.email}: ${parentError instanceof Error ? parentError.message : 'Unknown error'}`);
      }
    }

    const result: ImportResult = {
      success: true,
      details: {
        padresCreated,
        hijosCreated,
        errors,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
