import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAdminOrBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";

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
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();

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

    console.log(`Fetching image from: ${imageUrl}`);

    // Fetch the image
    let parsedUrl: URL;
    try { parsedUrl = new URL(String(imageUrl)); } catch { throw new Error("Invalid image URL"); }
    if (parsedUrl.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(parsedUrl.hostname)) {
      throw new Error("Only public https image URLs are allowed");
    }
    const imageResponse = await fetch(parsedUrl, { redirect: "error" });
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get("content-type") || "image/png";
    
    if (!contentType.toLowerCase().includes("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (Number(imageResponse.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("Image too large (max 5 MB)");
    const imageData = await imageResponse.arrayBuffer();
    if (imageData.byteLength > MAX_BYTES) throw new Error("Image too large (max 5 MB)");
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
