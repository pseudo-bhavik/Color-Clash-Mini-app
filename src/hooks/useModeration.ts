import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ModerationResult {
  safe: boolean;
  reason?: string;
  confidence: number;
}

export const useModeration = () => {
  const moderateContent = useCallback(async (
    content: string, 
    type: 'share_text' | 'username' | 'general' = 'general'
  ): Promise<ModerationResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { content, type }
      });

      if (error) {
        console.error('Moderation error:', error);
        // Fail safe - if moderation service is down, allow content but log it
        return {
          safe: true,
          reason: 'Moderation service unavailable',
          confidence: 0.5
        };
      }

      return data as ModerationResult;
    } catch (error) {
      console.error('Moderation request failed:', error);
      // Fail safe
      return {
        safe: true,
        reason: 'Moderation service error',
        confidence: 0.5
      };
    }
  }, []);

  return { moderateContent };
};