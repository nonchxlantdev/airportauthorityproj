import { useState } from 'react';
import { Download, MapPin } from 'lucide-react';
import { getOfflineMapConfigSummary, isOfflineMapConfigured } from '../config/offlineMap.js';
import { downloadOfflineMapTiles } from '../utils/offlineMapTiles.js';

export function OfflineMapDownloadButton() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ cachedCount: 0, totalCount: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  const isConfigured = isOfflineMapConfigured();
  const configMessage = getOfflineMapConfigSummary();

  async function handleDownload() {
    if (!isConfigured || status === 'downloading') return;

    setStatus('downloading');
    setErrorMessage('');
    setProgress({ cachedCount: 0, totalCount: 0 });

    try {
      await downloadOfflineMapTiles({
        onProgress: (nextProgress) => setProgress(nextProgress)
      });
      setStatus('done');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message || 'Offline map download failed.');
    }
  }

  const label = status === 'downloading'
    ? `Caching map ${progress.cachedCount}/${progress.totalCount}`
    : status === 'done'
      ? 'Offline map cached'
      : 'Download offline map';

  return (
    <div className="offline-map-download">
      <button
        className="export-button offline-map-button"
        type="button"
        onClick={handleDownload}
        disabled={!isConfigured || status === 'downloading'}
        title={!isConfigured ? configMessage : 'Cache airport map tiles for offline use'}
      >
        <MapPin size={18} />
        <Download size={16} />
        {label}
      </button>
      {!isConfigured && <p className="offline-map-hint">{configMessage}</p>}
      {status === 'error' && <p className="form-error offline-map-error">{errorMessage}</p>}
    </div>
  );
}
