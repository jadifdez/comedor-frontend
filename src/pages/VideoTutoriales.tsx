import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Settings, UserCircle, Utensils } from 'lucide-react';
import { videoTutoriales, categorias, VideoTutorial } from '../data/videoTutoriales';
import { VideoPlayerModal } from '../components/VideoPlayerModal';

const getCategoriaIcon = (categoriaId: string) => {
  switch (categoriaId) {
    case 'configuracion':
      return Settings;
    case 'primeros-pasos':
      return UserCircle;
    case 'funcionalidades':
      return Utensils;
    default:
      return PlayCircle;
  }
};

interface VideoCardProps {
  video: VideoTutorial;
  onPlay: (video: VideoTutorial) => void;
}

function VideoCard({ video, onPlay }: VideoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
      onClick={() => onPlay(video)}
    >
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <PlayCircle className="h-16 w-16 text-gray-400" />
          </div>
        )}

        <img
          src={video.portadaUrl}
          alt={video.titulo}
          className={`w-full h-full object-cover transition-all duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-105`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
          <div className="transform scale-0 group-hover:scale-100 transition-transform duration-300">
            <div className="bg-blue-600 rounded-full p-4 shadow-xl">
              <PlayCircle className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-lg group-hover:text-blue-600 transition-colors">
          {video.titulo}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {video.descripcion}
        </p>
      </div>
    </div>
  );
}

export default function VideoTutoriales() {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');

  const handleBackToLogin = () => {
    navigate('/');
  };

  const handlePlayVideo = (video: VideoTutorial) => {
    setSelectedVideo(video);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  const videosToShow = selectedCategoria === 'todos'
    ? videoTutoriales
    : videoTutoriales.filter(v => v.categoria === selectedCategoria);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/horizontal_positivo.png"
                alt="Colegio Los Pinos"
                className="h-12"
              />
              <div className="hidden sm:block border-l border-gray-300 pl-4">
                <h1 className="text-xl font-bold text-gray-900">Videotutoriales</h1>
                <p className="text-sm text-gray-600">Aprende a usar la plataforma</p>
              </div>
            </div>
            <button
              onClick={handleBackToLogin}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver al inicio de sesión</span>
              <span className="sm:hidden">Volver</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            ¿Necesitas ayuda?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Aquí encontrarás guías visuales paso a paso para aprender a usar todas las funcionalidades de la plataforma del comedor escolar
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <button
            onClick={() => setSelectedCategoria('todos')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              selectedCategoria === 'todos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Todos los videos
          </button>

          {Object.values(categorias).map((cat) => {
            const Icon = getCategoriaIcon(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  selectedCategoria === cat.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.nombre}</span>
              </button>
            );
          })}
        </div>

        {selectedCategoria !== 'todos' && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="flex items-start space-x-3">
              {React.createElement(getCategoriaIcon(selectedCategoria), {
                className: "h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5"
              })}
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  {categorias[selectedCategoria as keyof typeof categorias].nombre}
                </h3>
                <p className="text-sm text-blue-800">
                  {categorias[selectedCategoria as keyof typeof categorias].descripcion}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videosToShow.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={handlePlayVideo}
            />
          ))}
        </div>

        {videosToShow.length === 0 && (
          <div className="text-center py-12">
            <PlayCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron videos en esta categoría</p>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            ¿Tienes más preguntas? Contacta con la administración del colegio
          </p>
        </div>
      </div>

      {selectedVideo && (
        <VideoPlayerModal
          videoUrl={selectedVideo.videoUrl}
          titulo={selectedVideo.titulo}
          onClose={handleCloseVideo}
        />
      )}
    </div>
  );
}
