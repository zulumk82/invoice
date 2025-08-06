import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetwork } from '../../contexts/NetworkContext';
import { Badge } from './Badge';

export const NetworkStatus: React.FC = () => {
  const { isOnline, isSyncing, pendingChanges, syncData } = useNetwork();

  if (isOnline && !isSyncing && pendingChanges === 0) {
    return null; // Don't show anything when everything is fine
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Online</span>
            {isSyncing && (
              <>
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Syncing...</span>
              </>
            )}
            {pendingChanges > 0 && (
              <Badge className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {pendingChanges} pending
              </Badge>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Offline</span>
            {pendingChanges > 0 && (
              <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {pendingChanges} pending
              </Badge>
            )}
          </>
        )}
        
        {isOnline && pendingChanges > 0 && !isSyncing && (
          <button
            onClick={syncData}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sync Now
          </button>
        )}
      </div>
    </motion.div>
  );
}; 