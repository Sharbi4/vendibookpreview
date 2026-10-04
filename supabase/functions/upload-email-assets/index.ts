import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isTrustedOrAdmin, forbiddenResponse } from "../_shared/trustedCaller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  imageUrl: string;
  fileName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("upload-email-assets function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!(await isTrustedOrAdmin(req))) return forbiddenResponse(corsHeaders);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { imageUrl, fileName }: UploadRequest = await req.json();

    if (!imageUrl || !fileName) {
      return new Response(
        JSON.stringify({ error: "imageUrl and fileName are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Confine names to a flat, safe filename and only fetch https images.
    if (typeof fileName !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.(png|jpe?g|webp|gif|svg)$/i.test(fileName) || fileName.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid fileName" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    let parsedUrl: URL;
    try { parsedUrl = new URL(imageUrl); } catch { parsedUrl = new URL("about:blank"); }
    if (parsedUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "imageUrl must be https" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const MAX_BYTES = 5 * 1024 * 1024;
    console.log(`Fetching image from: ${parsedUrl.host}`);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get("content-type") || "image/png";
    
    if (!contentType.toLowerCase().includes("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const declared = Number(imageResponse.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("Image too large (max 5MB)");
    const imageData = await imageResponse.arrayBuffer();
    if (imageData.byteLength > MAX_BYTES) throw new Error("Image too large (max 5MB)");
    console.log(`Image fetched: ${imageData.byteLength} bytes, type: ${contentType}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("email-assets")
      .upload(fileName, imageData, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log("Upload successful:", data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("email-assets")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        path: data.path,
        publicUrl: urlData.publicUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in upload-email-assets function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
