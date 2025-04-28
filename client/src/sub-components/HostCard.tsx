// HostCard.tsx
import React from 'react';
import { Host } from '../utilities/props';

interface HostCardProps {
  host: Host;
}

const HostCard: React.FC<HostCardProps> = ({ host }) => (
  <div className="host-card">
    <div className="host-header">
      <div className="host-avatar">      
        {host.profilePicture ? (     
            <img 
              src={host.profilePicture} 
              alt={host.name} 
            />                     
        ) : (
          <div className="avatar-placeholder">
            {(host.name || host.name).charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="host-info">
        <h3 className="host-name">{host.name}</h3>
        <span className="response-time">{host.type === "Paid" ? ("$" + host.rate + " p/h") : (host.type) }</span>
      </div>
    </div>
    
    <div className="host-stats">
     
      <div className="stat-item">
        <span className="stat-label">Speaks:</span>
        <span className="stat-value">
          {host.languages?.length > 0 
            ? host.languages.map(lang => lang.label).join(', ') 
            : 'No languages specified'}
        </span>
      </div>
      {host.country && (
        <div className="stat-item">
          <span className="stat-label">Location:</span>
          <span className="stat-value">
            {host.city?.label ? `${host.city.label}, ` : ''}
            {host.province?.label ? `${host.province.label}, ` : ''}
            {host.country.label}
          </span>
        </div>
      )}
    </div>

    <p className="host-description">{host.bio || 'No description available'}</p>
    
    {host.open === 'Yes' && (
      <button className="status-badge accepting">Accepting Guests</button>
    )}
  </div>
);

export default HostCard;