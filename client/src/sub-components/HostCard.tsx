// HostCard.tsx
import React from 'react';
import { Host } from '../utilities/props';
import languages from "../assets/languages.json";

const HostCard: React.FC<{ host: Host }> = ({ host }) => {
  const getLanguageNames = () => {
    return host.languages
      .map(code => languages.find(l => l.code === code)?.name || code)
      .join(', ') || 'Not specified';
  };

  return (
    <div className="host-card">
      <div className="host-header">
        <div className="host-avatar">
          {host.profilePicture ? (
            <img src={host.profilePicture} alt={host.name} />
          ) : (
            <div className="avatar-placeholder">
              {host.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="host-info">
          <h3>{host.name}</h3>
          <span className="rate-badge">
            {host.type === 'Paid' ? `$${host.rate}/hr` : 'Volunteer'}
          </span>
        </div>
      </div>

      <div className="host-details">
        <div className="detail-row">
          <span>Speaks:</span>
          <span>{getLanguageNames()}</span>
        </div>
        
        {(host.city || host.province || host.country) && (
          <div className="detail-row">
            <span>Location:</span>
            <span>
              {[host.city, host.province, host.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      <p className="host-bio">{host.bio || 'No description available'}</p>

      {host.open === 'Yes' && (
        <div className="status-badge">Accepting Guests</div>
      )}
    </div>
  );
};

export default HostCard;