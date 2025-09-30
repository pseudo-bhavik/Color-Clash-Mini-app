import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface ModerationRequest {
  content: string;
  type: 'share_text' | 'username' | 'general';
}

interface ModerationResponse {
  safe: boolean;
  reason?: string;
  confidence: number;
}

// Basic profanity and harmful content filters
const BLOCKED_WORDS = [
  // Add your blocked words here
  'spam', 'scam', 'hack', 'exploit',
  // Add more as needed
];

const SUSPICIOUS_PATTERNS = [
  /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/\S*)?\b/g, // URLs
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email addresses
  /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, // Phone numbers
];

function moderateContent(content: string, type: string): ModerationResponse {
  const lowerContent = content.toLowerCase();
  
  // Check for blocked words
  for (const word of BLOCKED_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        safe: false,
        reason: 'Contains prohibited content',
        confidence: 0.9
      };
    }
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      // Allow URLs in share_text but be more restrictive elsewhere
      if (type !== 'share_text') {
        return {
          safe: false,
          reason: 'Contains suspicious patterns',
          confidence: 0.7
        };
      }
    }
  }
  
  // Check content length
  if (content.length > 500) {
    return {
      safe: false,
      reason: 'Content too long',
      confidence: 0.8
    };
  }
  
  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) {
    return {
      safe: false,
      reason: 'Excessive capitalization',
      confidence: 0.6
    };
  }
  
  // Check for repeated characters
  if (/(.)\1{4,}/.test(content)) {
    return {
      safe: false,
      reason: 'Spam-like content',
      confidence: 0.8
    };
  }
  
  return {
    safe: true,
    confidence: 0.9
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { content, type = 'general' }: ModerationRequest = await req.json()
    
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = moderateContent(content.trim(), type);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Moderation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        safe: false,
        reason: 'Moderation service unavailable',
        confidence: 0.5
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})