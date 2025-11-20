import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Filter } from 'lucide-react';

interface LogEntry {
  id: number;
  operation: string;
  user_email: string | null;
  user_id: string | null;
  is_admin_flag: boolean;
  padre_id: string | null;
  inscripcion_id: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  policy_matched: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export default function RLSLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOperation, setFilterOperation] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');
  const [limit, setLimit] = useState(50);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_recent_inscripcion_logs', { limit_count: limit });

      if (fetchError) throw fetchError;

      setLogs(data || []);
    } catch (err: any) {
      console.error('Error loading logs:', err);
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [limit]);

  const filteredLogs = logs.filter(log => {
    if (filterOperation !== 'all' && log.operation !== filterOperation) {
      return false;
    }
    if (filterSuccess === 'success' && !log.success) {
      return false;
    }
    if (filterSuccess === 'failed' && log.success) {
      return false;
    }
    return true;
  });

  const operationCounts = logs.reduce((acc, log) => {
    acc[log.operation] = (acc[log.operation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const policyCounts = logs.reduce((acc, log) => {
    acc[log.policy_matched] = (acc[log.policy_matched] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT': return 'text-green-600 bg-green-50';
      case 'UPDATE': return 'text-blue-600 bg-blue-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPolicyColor = (policy: string) => {
    if (policy.includes('NO_POLICY')) {
      return 'text-red-600 bg-red-50';
    }
    if (policy.includes('Admin')) {
      return 'text-purple-600 bg-purple-50';
    }
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RLS Policy Execution Logs</h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and debug Row Level Security policy execution for inscripciones_padres
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading logs</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Operations Summary</h3>
          <div className="space-y-2">
            {Object.entries(operationCounts).map(([op, count]) => (
              <div key={op} className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getOperationColor(op)}`}>
                  {op}
                </span>
                <span className="text-sm text-gray-600">{count} operations</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Policy Matches</h3>
          <div className="space-y-2">
            {Object.entries(policyCounts).map(([policy, count]) => (
              <div key={policy} className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPolicyColor(policy)}`}>
                  {policy.replace('Admins can manage all inscripciones', 'Admin').replace('Parents can manage own inscripciones', 'Parent')}
                </span>
                <span className="text-sm text-gray-600">{count} times</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="all">All Operations</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>

            <select
              value={filterSuccess}
              onChange={(e) => setFilterSuccess(e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="all">All Results</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="25">Last 25</option>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="500">Last 500</option>
            </select>

            <span className="text-sm text-gray-500 ml-auto">
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No logs found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy Matched
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Padre ID
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Range
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getOperationColor(log.operation)}`}>
                        {log.operation}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 max-w-xs truncate">
                      {log.user_email || <span className="text-gray-400 italic">null</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {log.is_admin_flag ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPolicyColor(log.policy_matched)}`}>
                        {log.policy_matched === 'Admins can manage all inscripciones' ? 'Admin' :
                         log.policy_matched === 'Parents can manage own inscripciones' ? 'Parent' :
                         log.policy_matched}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono max-w-xs truncate">
                      {log.padre_id ? log.padre_id.substring(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {log.fecha_inicio && log.fecha_fin ? (
                        <span>{log.fecha_inicio} → {log.fecha_fin}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {log.success ? (
                        <span className="text-green-600 font-medium">✓ Success</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About RLS Logging</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>This logs all INSERT, UPDATE, and DELETE operations on comedor_inscripciones_padres</li>
          <li>Logs capture which RLS policy would allow/deny the operation</li>
          <li>Use this to debug permission issues and audit user actions</li>
          <li>Policy "NO_POLICY_MATCHED" indicates an operation that should be blocked by RLS</li>
          <li>Only admins can view these logs</li>
        </ul>
      </div>
    </div>
  );
}
