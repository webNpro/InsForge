import { DallEAPIWrapper } from '@langchain/openai';
import type {
  ImageGenerationOptions,
  GeneratedImage,
  ImageProvider,
  ImageModelConfig,
} from '@/types/ai';

export class ImageService {
  private static modelConfigs: Record<string, ImageModelConfig> = {
    // OpenAI Models (via LangChain)
    'dall-e-3': {
      provider: 'openai',
      modelId: 'dall-e-3',
      displayName: 'DALL-E 3',
      supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
      defaultSize: '1024x1024',
    },
    'dall-e-2': {
      provider: 'openai',
      modelId: 'dall-e-2',
      displayName: 'DALL-E 2',
      supportedSizes: ['256x256', '512x512', '1024x1024'],
      defaultSize: '1024x1024',
    },

    // Google Imagen Models via Gemini API
    'imagen-4-ultra': {
      provider: 'google',
      modelId: 'imagen-4.0-ultra-generate-001',
      displayName: 'Google Imagen 4 Ultra',
      supportedSizes: ['1024x1024', '1024x768', '768x1024', '1536x1024', '1024x1536'],
      defaultSize: '1024x1024',
    },
    'imagen-4': {
      provider: 'google',
      modelId: 'imagen-4.0-generate-001',
      displayName: 'Google Imagen 4',
      supportedSizes: ['1024x1024', '1024x768', '768x1024', '1536x1024', '1024x1536'],
      defaultSize: '1024x1024',
    },
    'imagen-4-fast': {
      provider: 'google',
      modelId: 'imagen-4.0-fast-generate-001',
      displayName: 'Google Imagen 4 Fast',
      supportedSizes: ['1024x1024', '512x512'],
      defaultSize: '1024x1024',
    },
    'imagen-3': {
      provider: 'google',
      modelId: 'imagen-3.0-generate-002',
      displayName: 'Google Imagen 3',
      supportedSizes: ['1024x1024', '1024x768', '768x1024', '1536x1024', '1024x1536'],
      defaultSize: '1024x1024',
    },

    // Gemini Image Models (Nano Banana)
    'gemini-2.5-flash-image': {
      provider: 'google',
      modelId: 'gemini-2.5-flash-image-preview',
      displayName: 'Gemini 2.5 Flash Image (Nano Banana)',
      supportedSizes: ['1024x1024', '1024x768', '768x1024', '1536x1024', '1024x1536'],
      defaultSize: '1024x1024',
    },
    'gemini-2.0-flash-image': {
      provider: 'google',
      modelId: 'gemini-2.0-flash-preview-image-generation',
      displayName: 'Gemini 2.0 Flash Image',
      supportedSizes: ['1024x1024', '1024x768', '768x1024', '1536x1024', '1024x1536'],
      defaultSize: '1024x1024',
    },
  };

  /**
   * Get available image generation models
   */
  static getAvailableModels() {
    const models = [];
    for (const [key, config] of Object.entries(this.modelConfigs)) {
      models.push({
        id: key,
        provider: config.provider,
        modelId: config.modelId,
        displayName: config.displayName,
        supportedSizes: config.supportedSizes,
        defaultSize: config.defaultSize,
        available: this.isProviderConfigured(config.provider),
      });
    }
    return models;
  }

  /**
   * Check if provider is configured
   */
  private static isProviderConfigured(provider: ImageProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'xai':
        return !!process.env.XAI_API_KEY;
      case 'bedrock':
        return !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
      case 'google':
        return !!process.env.GOOGLE_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Parse size string to width and height
   */
  private static parseSize(sizeStr: string): { width: number; height: number } {
    const [width, height] = sizeStr.split('x').map(Number);
    return { width, height };
  }

  /**
   * Generate image using OpenAI DALL-E via LangChain
   */
  private static async generateWithOpenAI(
    options: ImageGenerationOptions
  ): Promise<GeneratedImage[]> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const config = ImageService.modelConfigs[options.model];
    const size = options.size || config.defaultSize || '1024x1024';

    // Validate size for the model
    if (config.supportedSizes && !config.supportedSizes.includes(size)) {
      throw new Error(
        `Size ${size} not supported for ${config.displayName}. Supported sizes: ${config.supportedSizes.join(', ')}`
      );
    }

    try {
      // Create DallEAPIWrapper with configuration
      const dalle = new DallEAPIWrapper({
        model: config.modelId as 'dall-e-2' | 'dall-e-3',
        n: options.numImages || 1,
        size: size as '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid',
        responseFormat: options.responseFormat || 'url',
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Generate image(s)
      const result = await dalle.invoke(options.prompt);

      // DallEAPIWrapper returns a URL string for single image or JSON for b64
      if (options.responseFormat === 'b64_json') {
        // When using b64_json, the result is a JSON string
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
              b64_json: item.b64_json,
              revised_prompt: item.revised_prompt,
            }));
          }
          return [
            {
              b64_json: parsed.b64_json,
              revised_prompt: parsed.revised_prompt,
            },
          ];
        } catch {
          return [{ b64_json: result }];
        }
      } else {
        // URL format - result is a URL string or comma-separated URLs
        const urls = result.split(',').map((url: string) => url.trim());
        return urls.map((url: string) => ({ url }));
      }
    } catch (error) {
      console.error('OpenAI image generation error:', error);
      throw new Error(
        `Failed to generate image with OpenAI: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate image using Google Imagen
   */
  private static async generateWithGoogle(
    options: ImageGenerationOptions
  ): Promise<GeneratedImage[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    const config = ImageService.modelConfigs[options.model];
    const size = options.size || config.defaultSize || '1024x1024';
    const { width, height } = ImageService.parseSize(size);

    try {
      // Import Google GenAI SDK dynamically
      const { GoogleGenAI } = await import('@google/genai');

      // Initialize the SDK
      const genAI = new GoogleGenAI({
        apiKey: process.env.GOOGLE_API_KEY,
      });

      // Get the models API
      const models = genAI.models;

      // Check if this is a Gemini model (uses generateContent) or Imagen model (uses generateImages)
      const isGeminiModel = config.modelId.startsWith('gemini-');

      if (isGeminiModel) {
        // Use generateContent for Gemini models (Nano Banana)
        const result = await models.generateContent({
          model: config.modelId,
          contents: options.prompt,
        });

        // Process Gemini response
        const images: GeneratedImage[] = [];

        if (result && result.candidates && Array.isArray(result.candidates)) {
          for (const candidate of result.candidates) {
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  // Base64 format
                  images.push({
                    b64_json: part.inlineData.data,
                  });
                } else if (part.fileData && part.fileData.fileUri) {
                  // File URI format
                  images.push({
                    url: part.fileData.fileUri,
                  });
                }
              }
            }
          }
        }

        if (images.length === 0) {
          throw new Error('No images generated from Gemini model');
        }

        return images;
      } else {
        // Use generateImages for standard Imagen models
        const result = await models.generateImages({
          model: `models/${config.modelId}`,
          prompt: options.prompt,
          config: {
            numberOfImages: options.numImages || 1,
            aspectRatio: `${width}:${height}`,
            // Add negative prompt if provided
            ...(options.negativePrompt && { negativePrompt: options.negativePrompt }),
            // Add guidance scale if provided
            ...(options.guidanceScale && { guidanceScale: options.guidanceScale }),
            // Add seed if provided
            ...(options.seed && { seed: options.seed }),
          },
        });

        // Process Imagen response
        const images: GeneratedImage[] = [];

        if (result && result.generatedImages && Array.isArray(result.generatedImages)) {
          for (const generatedImage of result.generatedImages) {
            if (generatedImage.image) {
              // Check if it's base64 or GCS URI
              if (generatedImage.image.imageBytes) {
                // Base64 format
                images.push({
                  b64_json: generatedImage.image.imageBytes,
                });
              } else if (generatedImage.image.gcsUri) {
                // GCS URI format
                images.push({
                  url: generatedImage.image.gcsUri,
                });
              }
            }
          }
        }

        if (images.length === 0) {
          throw new Error('No images generated from Imagen model');
        }

        return images;
      }
    } catch (error) {
      console.error('Google Imagen generation error:', error);

      throw new Error(
        `Failed to generate image with Google Imagen: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate images using the specified model
   */
  static async generate(options: ImageGenerationOptions): Promise<GeneratedImage[]> {
    const config = ImageService.modelConfigs[options.model];
    if (!config) {
      throw new Error(`Unknown model: ${options.model}`);
    }

    switch (config.provider) {
      case 'openai':
        return ImageService.generateWithOpenAI(options);
      case 'google':
        return ImageService.generateWithGoogle(options);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}
