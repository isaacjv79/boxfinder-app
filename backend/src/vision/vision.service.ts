import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ItemAnalysis {
  name: string;
  description: string;
  category: string;
  tags: string[];
  confidence: number;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({ apiKey: apiKey || '' });
  }

  async analyzeImage(imageBase64: string): Promise<ItemAnalysis> {
    try {
      const prompt = `Analiza este objeto para un inventario domestico.

Tu tarea es identificar el objeto en la imagen y proporcionar informacion util para encontrarlo despues.

Responde SOLO con un JSON valido (sin markdown, sin explicaciones adicionales) con este formato exacto:
{
  "name": "nombre especifico del objeto (ej: 'Sueter azul de lana', 'Adorno navideño de reno')",
  "description": "descripcion breve de 1-2 oraciones describiendo el objeto",
  "category": "una de: ropa, decoracion, herramientas, electronica, libros, juguetes, cocina, documentos, deportes, jardin, otro",
  "tags": ["array", "de", "palabras", "clave", "para", "busqueda"],
  "confidence": 0.95
}

IMPORTANTE:
- El nombre debe ser especifico y descriptivo
- Los tags deben incluir color, material, uso, temporada si aplica
- La confianza (confidence) es un numero entre 0 y 1
- Responde SOLO el JSON, sin backticks ni markdown`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract text from response
      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      let text = textBlock.text;

      // Clean up response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse JSON response
      const analysis = JSON.parse(text) as ItemAnalysis;

      this.logger.log(`Analyzed item: ${analysis.name}`);

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing image with Claude Vision', error);

      // Return default analysis on error
      return {
        name: 'Objeto no identificado',
        description: 'No se pudo analizar la imagen automaticamente',
        category: 'otro',
        tags: [],
        confidence: 0,
      };
    }
  }

  async analyzeMultipleImages(
    images: string[],
  ): Promise<{ items: ItemAnalysis[]; summary: string }> {
    try {
      const prompt = `Analiza estos ${images.length} objetos para un inventario domestico.

Responde SOLO con un JSON valido (sin markdown, sin backticks) con este formato:
{
  "items": [
    {
      "name": "nombre especifico",
      "description": "descripcion breve",
      "category": "categoria",
      "tags": ["tags"],
      "confidence": 0.95
    }
  ],
  "summary": "resumen breve de todos los objetos"
}

Categorias validas: ropa, decoracion, herramientas, electronica, libros, juguetes, cocina, documentos, deportes, jardin, otro`;

      const imageContents = images.map((img) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: img,
        },
      }));

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContents,
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      let text = textBlock.text;

      // Clean up response
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Error analyzing multiple images', error);
      return {
        items: images.map(() => ({
          name: 'Objeto no identificado',
          description: 'No se pudo analizar',
          category: 'otro',
          tags: [],
          confidence: 0,
        })),
        summary: 'Error al analizar las imagenes',
      };
    }
  }
}
