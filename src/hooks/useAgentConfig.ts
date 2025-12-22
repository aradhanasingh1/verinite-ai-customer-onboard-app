// src/hooks/useAgentConfig.ts
import { useState, useEffect } from 'react';

interface AgentConfig {
  type: string;
  endpoint: string;
  timeout_ms: number;
  enabled: boolean;
}

export function useAgentConfig(slot: string) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAgentConfig = async () => {
      try {
        const response = await fetch(`/api/agents/${slot}/config`);
        if (!response.ok) {
          throw new Error(`Failed to load agent config for ${slot}`);
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error(`Error loading agent config for ${slot}:`, err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchAgentConfig();
  }, [slot]);

  return { config, loading, error };
}