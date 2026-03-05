import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AuditStep {
  id: string | number;
  stepNumber: number;
  description: string;
  timestamp: string;
  userInput: string;
  status: string;
}

const AuditTrail = () => {
  const [auditTrail, setAuditTrail] = useState<AuditStep[]>([]);

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    try {
      const response = await axios.get('/api/audit-trail');
      setAuditTrail(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 className='text-2xl font-bold text-white mb-2'>Audit Trail</h1>
      <table>
        <thead>
          <tr>
            <th>Step Number</th>
            <th>Description</th>
            <th>Timestamp</th>
            <th>User Input</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {auditTrail.map((step) => (
            <tr key={step.id}>
              <td>{step.stepNumber}</td>
              <td>{step.description}</td>
              <td>{step.timestamp}</td>
              <td>{step.userInput}</td>
              <td>{step.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditTrail;