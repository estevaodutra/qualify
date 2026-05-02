export interface Attribute {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface Endpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  attributes: Attribute[];
  statusCodes?: { code: string; description: string }[];
  examples: {
    curl: string;
    nodejs: string;
    python: string;
  };
  responses: {
    success: {
      code: number;
      body: object;
    };
    error: {
      code: number;
      body: object;
    };
  };
}

export interface EndpointCategory {
  id: string;
  name: string;
  description: string;
  endpoints: Endpoint[];
}

const API_BASE_URL = "https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1";

export const apiEndpoints: EndpointCategory[] = [
  {
    id: "messages",
    name: "Mensagens",
    description: "Endpoints para envio de mensagens",
    endpoints: [
      {
        id: "send-text",
        method: "POST",
        path: "/send-text",
        description: "Envia uma mensagem de texto simples para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "message",
            type: "string",
            required: true,
            description: "Conteúdo da mensagem (máx: 4096 caracteres)"
          },
          {
            name: "delayMessage",
            type: "number",
            required: false,
            description: "Delay em segundos antes de enviar (0-30)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-text" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste."
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-text',
  {
    phone: '5511999999999',
    message: 'Olá! Esta é uma mensagem de teste.'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-text',
    json={
        'phone': '5511999999999',
        'message': 'Olá! Esta é uma mensagem de teste.'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E678",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:30:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_PHONE",
                message: "O número de telefone fornecido é inválido."
              }
            }
          }
        }
      },
      {
        id: "send-media",
        method: "POST",
        path: "/send-media",
        description: "Envia uma imagem, vídeo ou áudio para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "mediaUrl",
            type: "string",
            required: true,
            description: "URL pública da mídia (imagem, vídeo ou áudio)"
          },
          {
            name: "mediaType",
            type: "string",
            required: true,
            description: "Tipo da mídia: 'image', 'video' ou 'audio'"
          },
          {
            name: "caption",
            type: "string",
            required: false,
            description: "Legenda da mídia (máx: 1024 caracteres)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-media" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "mediaUrl": "https://example.com/image.jpg",
    "mediaType": "image",
    "caption": "Confira esta imagem!"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-media',
  {
    phone: '5511999999999',
    mediaUrl: 'https://example.com/image.jpg',
    mediaType: 'image',
    caption: 'Confira esta imagem!'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-media',
    json={
        'phone': '5511999999999',
        'mediaUrl': 'https://example.com/image.jpg',
        'mediaType': 'image',
        'caption': 'Confira esta imagem!'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E679",
              phone: "5511999999999",
              mediaType: "image",
              timestamp: "2024-01-15T10:35:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_MEDIA_URL",
                message: "A URL da mídia não é acessível ou inválida."
              }
            }
          }
        }
      },
      {
        id: "send-document",
        method: "POST",
        path: "/send-document",
        description: "Envia um documento (PDF, DOC, XLS, etc.) para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "documentUrl",
            type: "string",
            required: true,
            description: "URL pública do documento"
          },
          {
            name: "fileName",
            type: "string",
            required: true,
            description: "Nome do arquivo com extensão (ex: 'relatorio.pdf')"
          },
          {
            name: "caption",
            type: "string",
            required: false,
            description: "Legenda do documento (máx: 1024 caracteres)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-document" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "documentUrl": "https://example.com/report.pdf",
    "fileName": "relatorio.pdf",
    "caption": "Segue o relatório solicitado"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-document',
  {
    phone: '5511999999999',
    documentUrl: 'https://example.com/report.pdf',
    fileName: 'relatorio.pdf',
    caption: 'Segue o relatório solicitado'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-document',
    json={
        'phone': '5511999999999',
        'documentUrl': 'https://example.com/report.pdf',
        'fileName': 'relatorio.pdf',
        'caption': 'Segue o relatório solicitado'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E680",
              phone: "5511999999999",
              fileName: "relatorio.pdf",
              timestamp: "2024-01-15T10:40:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_DOCUMENT",
                message: "O documento não pôde ser processado."
              }
            }
          }
        }
      },
      {
        id: "send-location",
        method: "POST",
        path: "/send-location",
        description: "Envia uma localização geográfica para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "latitude",
            type: "number",
            required: true,
            description: "Latitude da localização (-90 a 90)"
          },
          {
            name: "longitude",
            type: "number",
            required: true,
            description: "Longitude da localização (-180 a 180)"
          },
          {
            name: "name",
            type: "string",
            required: false,
            description: "Nome do local"
          },
          {
            name: "address",
            type: "string",
            required: false,
            description: "Endereço completo do local"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-location" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "Escritório Central",
    "address": "Av. Paulista, 1000 - São Paulo, SP"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-location',
  {
    phone: '5511999999999',
    latitude: -23.5505,
    longitude: -46.6333,
    name: 'Escritório Central',
    address: 'Av. Paulista, 1000 - São Paulo, SP'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-location',
    json={
        'phone': '5511999999999',
        'latitude': -23.5505,
        'longitude': -46.6333,
        'name': 'Escritório Central',
        'address': 'Av. Paulista, 1000 - São Paulo, SP'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E681",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:45:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_COORDINATES",
                message: "As coordenadas fornecidas são inválidas."
              }
            }
          }
        }
      },
      {
        id: "send-contact",
        method: "POST",
        path: "/send-contact",
        description: "Envia um cartão de contato (vCard) para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "contactName",
            type: "string",
            required: true,
            description: "Nome completo do contato"
          },
          {
            name: "contactPhone",
            type: "string",
            required: true,
            description: "Número de telefone do contato"
          },
          {
            name: "contactEmail",
            type: "string",
            required: false,
            description: "E-mail do contato"
          },
          {
            name: "contactOrganization",
            type: "string",
            required: false,
            description: "Organização/Empresa do contato"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-contact" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "contactName": "João Silva",
    "contactPhone": "5511988888888",
    "contactEmail": "joao@empresa.com",
    "contactOrganization": "Empresa XYZ"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-contact',
  {
    phone: '5511999999999',
    contactName: 'João Silva',
    contactPhone: '5511988888888',
    contactEmail: 'joao@empresa.com',
    contactOrganization: 'Empresa XYZ'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-contact',
    json={
        'phone': '5511999999999',
        'contactName': 'João Silva',
        'contactPhone': '5511988888888',
        'contactEmail': 'joao@empresa.com',
        'contactOrganization': 'Empresa XYZ'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E682",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:50:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_CONTACT",
                message: "Os dados do contato são inválidos ou incompletos."
              }
            }
          }
        }
      },
      {
        id: "send-list",
        method: "POST",
        path: "/send-list",
        description: "Envia uma mensagem com lista de opções interativas.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Título da lista (máx: 60 caracteres)"
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Descrição da lista (máx: 1024 caracteres)"
          },
          {
            name: "buttonText",
            type: "string",
            required: true,
            description: "Texto do botão para abrir a lista (máx: 20 caracteres)"
          },
          {
            name: "sections",
            type: "array",
            required: true,
            description: "Array de seções, cada uma com título e rows (opções)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-list" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "title": "Menu de Opções",
    "description": "Selecione uma opção abaixo",
    "buttonText": "Ver opções",
    "sections": [
      {
        "title": "Produtos",
        "rows": [
          {"id": "prod_1", "title": "Produto A", "description": "Descrição do produto A"},
          {"id": "prod_2", "title": "Produto B", "description": "Descrição do produto B"}
        ]
      }
    ]
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-list',
  {
    phone: '5511999999999',
    title: 'Menu de Opções',
    description: 'Selecione uma opção abaixo',
    buttonText: 'Ver opções',
    sections: [
      {
        title: 'Produtos',
        rows: [
          { id: 'prod_1', title: 'Produto A', description: 'Descrição do produto A' },
          { id: 'prod_2', title: 'Produto B', description: 'Descrição do produto B' }
        ]
      }
    ]
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-list',
    json={
        'phone': '5511999999999',
        'title': 'Menu de Opções',
        'description': 'Selecione uma opção abaixo',
        'buttonText': 'Ver opções',
        'sections': [
            {
                'title': 'Produtos',
                'rows': [
                    {'id': 'prod_1', 'title': 'Produto A', 'description': 'Descrição do produto A'},
                    {'id': 'prod_2', 'title': 'Produto B', 'description': 'Descrição do produto B'}
                ]
            }
        ]
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E683",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:55:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_LIST",
                message: "A estrutura da lista é inválida."
              }
            }
          }
        }
      },
      {
        id: "send-buttons",
        method: "POST",
        path: "/send-buttons",
        description: "Envia uma mensagem com botões de resposta rápida.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Título da mensagem (máx: 60 caracteres)"
          },
          {
            name: "description",
            type: "string",
            required: false,
            description: "Descrição adicional (máx: 1024 caracteres)"
          },
          {
            name: "buttons",
            type: "array",
            required: true,
            description: "Array de botões (máx: 3), cada um com id e text"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-buttons" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "title": "Confirme sua escolha",
    "description": "Selecione uma das opções abaixo",
    "buttons": [
      {"id": "btn_yes", "text": "Sim"},
      {"id": "btn_no", "text": "Não"},
      {"id": "btn_maybe", "text": "Talvez"}
    ]
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-buttons',
  {
    phone: '5511999999999',
    title: 'Confirme sua escolha',
    description: 'Selecione uma das opções abaixo',
    buttons: [
      { id: 'btn_yes', text: 'Sim' },
      { id: 'btn_no', text: 'Não' },
      { id: 'btn_maybe', text: 'Talvez' }
    ]
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-buttons',
    json={
        'phone': '5511999999999',
        'title': 'Confirme sua escolha',
        'description': 'Selecione uma das opções abaixo',
        'buttons': [
            {'id': 'btn_yes', 'text': 'Sim'},
            {'id': 'btn_no', 'text': 'Não'},
            {'id': 'btn_maybe', 'text': 'Talvez'}
        ]
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E684",
              phone: "5511999999999",
              timestamp: "2024-01-15T11:00:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_BUTTONS",
                message: "A estrutura dos botões é inválida."
              }
            }
          }
        }
      },
      {
        id: "send-reaction",
        method: "POST",
        path: "/send-reaction",
        description: "Envia uma reação (emoji) a uma mensagem existente.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "ID da mensagem a ser reagida"
          },
          {
            name: "reaction",
            type: "string",
            required: true,
            description: "Emoji da reação (ex: '👍', '❤️', '😂')"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-reaction" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "messageId": "BAE5F4A3C2D1E678",
    "reaction": "👍"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-reaction',
  {
    phone: '5511999999999',
    messageId: 'BAE5F4A3C2D1E678',
    reaction: '👍'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-reaction',
    json={
        'phone': '5511999999999',
        'messageId': 'BAE5F4A3C2D1E678',
        'reaction': '👍'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E685",
              reactionTo: "BAE5F4A3C2D1E678",
              timestamp: "2024-01-15T11:05:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "MESSAGE_NOT_FOUND",
                message: "A mensagem referenciada não foi encontrada."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "instance",
    name: "Instância",
    description: "Gerenciamento de conexão WhatsApp",
    endpoints: [
      {
        id: "list-instances",
        method: "GET",
        path: "/instances",
        description: "Lista todas as instâncias do WhatsApp associadas à conta.",
        attributes: [
          {
            name: "page",
            type: "number",
            required: false,
            description: "Página para paginação (default: 1)"
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Limite de resultados por página (default: 10, máx: 100)"
          }
        ],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/instances?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/instances',
  {
    params: { page: 1, limit: 10 },
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/instances',
    params={'page': 1, 'limit': 10},
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              data: [
                {
                  id: "inst_abc123",
                  name: "WhatsApp Principal",
                  phone: "5511999999999",
                  status: "connected",
                  createdAt: "2024-01-15T08:00:00Z"
                }
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1
              }
            }
          },
          error: {
            code: 401,
            body: {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "Token de autenticação inválido ou expirado."
              }
            }
          }
        }
      },
      {
        id: "find-instance",
        method: "GET",
        path: "/instance-find",
        description: "Busca uma instância específica por ID, número de telefone ou credenciais externas.",
        attributes: [
          {
            name: "instanceId",
            type: "string",
            required: false,
            description: "ID da instância no Dispatch One"
          },
          {
            name: "phone",
            type: "string",
            required: false,
            description: "Número de telefone da instância"
          },
          {
            name: "externalInstanceId",
            type: "string",
            required: false,
            description: "ID da instância no provedor externo (Z-API, Evolution, etc)"
          },
          {
            name: "externalInstanceToken",
            type: "string",
            required: false,
            description: "Token de autenticação da instância no provedor externo"
          }
        ],
        examples: {
          curl: `# Buscar por instanceId
curl -X GET "${API_BASE_URL}/instance-find?instanceId=inst_abc123" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Buscar por externalInstanceId
curl -X GET "${API_BASE_URL}/instance-find?externalInstanceId=ext_xyz789" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Buscar por externalInstanceToken
curl -X GET "${API_BASE_URL}/instance-find?externalInstanceToken=token_abc123" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

// Buscar por instanceId
const response = await axios.get(
  '${API_BASE_URL}/instance-find',
  {
    params: { instanceId: 'inst_abc123' },
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);

// Ou buscar por externalInstanceId
const response2 = await axios.get(
  '${API_BASE_URL}/instance-find',
  {
    params: { externalInstanceId: 'ext_xyz789' },
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

# Buscar por instanceId
response = requests.get(
    '${API_BASE_URL}/instance-find',
    params={'instanceId': 'inst_abc123'},
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)

# Ou buscar por externalInstanceId
response2 = requests.get(
    '${API_BASE_URL}/instance-find',
    params={'externalInstanceId': 'ext_xyz789'},
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              instance: {
                id: "inst_abc123",
                name: "WhatsApp Principal",
                phone: "5511999999999",
                status: "connected",
                createdAt: "2024-01-15T08:00:00Z",
                lastMessageAt: "2024-01-15T11:30:00Z",
                messagesCount: 1542
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "INSTANCE_NOT_FOUND",
                message: "Instância não encontrada."
              }
            }
          }
        }
      },
      {
        id: "update-instance-status",
        method: "PUT",
        path: "/instance-status",
        description: "Atualiza o status de uma instância (conectar/desconectar).",
        attributes: [
          {
            name: "instanceId",
            type: "string",
            required: true,
            description: "ID da instância"
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "Novo status: 'connected', 'disconnected' ou 'waiting connection'"
          }
        ],
        examples: {
          curl: `curl -X PUT "${API_BASE_URL}/instance-status" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "instanceId": "inst_abc123",
    "status": "disconnected"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.put(
  '${API_BASE_URL}/instance-status',
  {
    instanceId: 'inst_abc123',
    status: 'disconnected'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.put(
    '${API_BASE_URL}/instance-status',
    json={
        'instanceId': 'inst_abc123',
        'status': 'disconnected'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              instanceId: "inst_abc123",
              previousStatus: "connected",
              newStatus: "disconnected",
              updatedAt: "2024-01-15T12:00:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_STATUS",
                message: "Status inválido. Use: 'connected', 'disconnected' ou 'waiting connection'."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Configuração de webhooks para recebimento de eventos",
    endpoints: [
      {
        id: "set-webhook",
        method: "POST",
        path: "/webhook/set",
        description: "Configura a URL do webhook para receber eventos.",
        attributes: [
          {
            name: "url",
            type: "string",
            required: true,
            description: "URL do webhook (deve ser HTTPS)"
          },
          {
            name: "events",
            type: "array",
            required: false,
            description: "Lista de eventos a receber (default: todos)"
          },
          {
            name: "secret",
            type: "string",
            required: false,
            description: "Segredo para validação de assinatura do webhook"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/webhook/set" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "url": "https://meusite.com/webhook",
    "events": ["message.received", "message.sent", "message.delivered"],
    "secret": "meu_segredo_webhook"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/webhook/set',
  {
    url: 'https://meusite.com/webhook',
    events: ['message.received', 'message.sent', 'message.delivered'],
    secret: 'meu_segredo_webhook'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/webhook/set',
    json={
        'url': 'https://meusite.com/webhook',
        'events': ['message.received', 'message.sent', 'message.delivered'],
        'secret': 'meu_segredo_webhook'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              webhookId: "wh_abc123",
              url: "https://meusite.com/webhook",
              events: ["message.received", "message.sent", "message.delivered"]
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_WEBHOOK_URL",
                message: "A URL do webhook é inválida ou não é HTTPS."
              }
            }
          }
        }
      },
      {
        id: "get-webhook",
        method: "GET",
        path: "/webhook",
        description: "Obtém a configuração atual do webhook.",
        attributes: [],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/webhook" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/webhook',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/webhook',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              webhook: {
                id: "wh_abc123",
                url: "https://meusite.com/webhook",
                events: ["message.received", "message.sent"],
                createdAt: "2024-01-10T10:00:00Z",
                lastDeliveryAt: "2024-01-15T09:30:00Z"
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "WEBHOOK_NOT_CONFIGURED",
                message: "Nenhum webhook configurado."
              }
            }
          }
        }
      },
      {
        id: "delete-webhook",
        method: "DELETE",
        path: "/webhook",
        description: "Remove a configuração do webhook.",
        attributes: [],
        examples: {
          curl: `curl -X DELETE "${API_BASE_URL}/webhook" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.delete(
  '${API_BASE_URL}/webhook',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.delete(
    '${API_BASE_URL}/webhook',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Webhook removido com sucesso."
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "WEBHOOK_NOT_FOUND",
                message: "Webhook não encontrado."
              }
            }
          }
        }
      },
      {
        id: "test-webhook",
        method: "POST",
        path: "/webhook/test",
        description: "Envia um evento de teste para o webhook configurado.",
        attributes: [],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/webhook/test" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/webhook/test',
  {},
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/webhook/test',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Evento de teste enviado com sucesso.",
              statusCode: 200,
              responseTime: 150
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "WEBHOOK_TEST_FAILED",
                message: "Falha ao enviar evento de teste."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "poll-responses",
    name: "Respostas de Enquetes",
    description: "Endpoints para processar respostas de enquetes",
    endpoints: [
      {
        id: "handle-poll-response",
        method: "POST",
        path: "/handle-poll-response",
        description: "Processa a resposta de um participante a uma enquete e executa a ação configurada para a opção selecionada.",
        attributes: [
          {
            name: "message_id",
            type: "string",
            required: true,
            description: "ID da mensagem da enquete (ou zaap_id retornado pela Z-API)"
          },
          {
            name: "instance_id",
            type: "string",
            required: false,
            description: "UUID da instância WhatsApp"
          },
          {
            name: "group_jid",
            type: "string",
            required: false,
            description: "JID do grupo (ex: 120363423000705472@g.us)"
          },
          {
            name: "respondent.phone",
            type: "string",
            required: true,
            description: "Telefone de quem respondeu (ex: 5511999999999)"
          },
          {
            name: "respondent.name",
            type: "string",
            required: false,
            description: "Nome do participante (pushName do WhatsApp)"
          },
          {
            name: "respondent.jid",
            type: "string",
            required: false,
            description: "JID completo do respondente"
          },
          {
            name: "response.option_index",
            type: "number",
            required: true,
            description: "Índice da opção selecionada (começa em 0)"
          },
          {
            name: "response.option_text",
            type: "string",
            required: false,
            description: "Texto da opção selecionada"
          },
          {
            name: "timestamp",
            type: "string",
            required: false,
            description: "Data/hora da resposta (ISO 8601)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/handle-poll-response" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message_id": "FB9520F9EB28F8FDF1CE",
    "instance_id": "uuid-da-instancia",
    "group_jid": "120363423000705472@g.us",
    "respondent": {
      "phone": "5512982402981",
      "name": "João Silva",
      "jid": "5512982402981@s.whatsapp.net"
    },
    "response": {
      "option_index": 0,
      "option_text": "Venceu quero Renovar"
    },
    "timestamp": "2025-01-24T14:30:00Z"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/handle-poll-response',
  {
    message_id: 'FB9520F9EB28F8FDF1CE',
    instance_id: 'uuid-da-instancia',
    group_jid: '120363423000705472@g.us',
    respondent: {
      phone: '5512982402981',
      name: 'João Silva',
      jid: '5512982402981@s.whatsapp.net'
    },
    response: {
      option_index: 0,
      option_text: 'Venceu quero Renovar'
    },
    timestamp: '2025-01-24T14:30:00Z'
  },
  {
    headers: {
      'Content-Type': 'application/json'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/handle-poll-response',
    json={
        'message_id': 'FB9520F9EB28F8FDF1CE',
        'instance_id': 'uuid-da-instancia',
        'group_jid': '120363423000705472@g.us',
        'respondent': {
            'phone': '5512982402981',
            'name': 'João Silva',
            'jid': '5512982402981@s.whatsapp.net'
        },
        'response': {
            'option_index': 0,
            'option_text': 'Venceu quero Renovar'
        },
        'timestamp': '2025-01-24T14:30:00Z'
    },
    headers={
        'Content-Type': 'application/json'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Action executed successfully",
              data: {
                action_type: "start_sequence",
                action_id: "uuid-da-acao",
                executed_at: "2025-01-24T14:30:05Z"
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: "POLL_NOT_FOUND",
              message: "Poll message not found"
            }
          }
        }
      }
    ]
  },
  {
    id: "webhooks-inbound",
    name: "Webhooks (Recebimento)",
    description: "Endpoint para receber eventos do WhatsApp via n8n",
    endpoints: [
      {
        id: "webhook-inbound",
        method: "POST",
        path: "/webhook-inbound",
        description: "Recebe eventos de WhatsApp repassados pelo n8n. O sistema classifica automaticamente o tipo de evento e extrai contexto (chat, remetente, message_id). Este endpoint é público e não requer autenticação.",
        attributes: [
          {
            name: "source",
            type: "string",
            required: true,
            description: "Origem do evento: 'z-api', 'evolution' ou 'meta'"
          },
          {
            name: "instance_id",
            type: "string",
            required: true,
            description: "ID externo da instância WhatsApp (identificador no provedor)"
          },
          {
            name: "received_at",
            type: "string",
            required: false,
            description: "Data/hora do recebimento no formato ISO 8601 (ex: 2025-01-26T14:30:00.000Z)"
          },
          {
            name: "raw_event",
            type: "object",
            required: true,
            description: "Payload original do provedor sem modificações"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/webhook-inbound" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "z-api",
    "instance_id": "instance_001",
    "raw_event": {
      "event": "message.received",
      "data": {
        "key": { "remoteJid": "5511999999999@s.whatsapp.net", "id": "MSG123" },
        "message": { "conversation": "Olá!" },
        "pushName": "João Silva",
        "messageTimestamp": 1706284200
      }
    }
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/webhook-inbound',
  {
    source: 'z-api',
    instance_id: 'instance_001',
    raw_event: {
      event: 'message.received',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'MSG123' },
        message: { conversation: 'Olá!' },
        pushName: 'João Silva',
        messageTimestamp: 1706284200
      }
    }
  },
  {
    headers: {
      'Content-Type': 'application/json'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/webhook-inbound',
    json={
        'source': 'z-api',
        'instance_id': 'instance_001',
        'raw_event': {
            'event': 'message.received',
            'data': {
                'key': { 'remoteJid': '5511999999999@s.whatsapp.net', 'id': 'MSG123' },
                'message': { 'conversation': 'Olá!' },
                'pushName': 'João Silva',
                'messageTimestamp': 1706284200
            }
        }
    },
    headers={
        'Content-Type': 'application/json'
    }
)`
        },
        responses: {
          success: {
            code: 201,
            body: {
              success: true,
              event_id: "uuid-do-evento",
              event_type: "text_message",
              classification: "identified"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: "Missing required fields: source, instance_id, raw_event"
            }
          }
        }
      }
    ]
  },
  {
    id: "validation",
    name: "Validação",
    description: "Endpoints para validação de contatos WhatsApp",
    endpoints: [
      {
        id: "phone-validation",
        method: "POST",
        path: "/phone-validation",
        description: "Verifica se um número de telefone possui WhatsApp ativo. Utiliza automaticamente uma instância conectada da sua conta para fazer a validação via Z-API.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999). Apenas números, sem espaços ou caracteres especiais."
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/phone-validation" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/phone-validation',
  {
    phone: '5511999999999'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);

console.log(response.data);
// { success: true, exists: true, phone: "5511999999999", lid: "123@lid", instance_used: "Minha Instância" }`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/phone-validation',
    json={
        'phone': '5511999999999'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)

print(response.json())
# { "success": True, "exists": True, "phone": "5511999999999", "lid": "123@lid", "instance_used": "Minha Instância" }`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              exists: true,
              phone: "5511999999999",
              lid: "999999999@lid",
              instance_used: "Nome da Instância"
            }
          },
          error: {
            code: 503,
            body: {
              success: false,
              error: {
                code: "NO_CONNECTED_INSTANCE",
                message: "Nenhuma instância WhatsApp está conectada para fazer a validação."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "queries",
    name: "Consultas",
    description: "Endpoints para consultar dados de mensagens e eventos",
    endpoints: [
      {
        id: "message-content",
        method: "GET",
        path: "/message-content",
        description: "Consulta o conteúdo de uma mensagem pelo messageId do WhatsApp. Retorna dados estruturados incluindo texto, mídia, enquete, localização, etc.",
        attributes: [
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "ID da mensagem do WhatsApp (ex: 3EB0191BA58CF690D254A1)"
          },
          {
            name: "include_raw",
            type: "boolean",
            required: false,
            description: "Se true, inclui o payload original completo (raw_event) na resposta"
          }
        ],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/message-content?messageId=3EB0191BA58CF690D254A1" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/message-content',
  {
    params: {
      messageId: '3EB0191BA58CF690D254A1',
      include_raw: false
    },
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);

console.log(response.data);
// { success: true, data: { event_id: "...", message_id: "...", content: { text: "..." } } }`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/message-content',
    params={
        'messageId': '3EB0191BA58CF690D254A1',
        'include_raw': False
    },
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)

print(response.json())
# { "success": True, "data": { "event_id": "...", "message_id": "...", "content": { "text": "..." } } }`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              data: {
                event_id: "42ff3cb2-c0c0-4f15-b829-5db21bfaa351",
                message_id: "3EB0191BA58CF690D254A1",
                event_type: "poll_response",
                event_subtype: null,
                chat_jid: "120363376787776025@g.us",
                chat_name: "Grupo Exemplo",
                chat_type: "group",
                sender_phone: "5511999999999",
                sender_name: "João Silva",
                content: {
                  pollMessageId: "3EB0191BA58CF690D254A1",
                  options: [{ name: "Opção selecionada" }]
                },
                timestamp: "2025-01-27T21:42:11.000Z"
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "MESSAGE_NOT_FOUND",
                message: "Nenhuma mensagem encontrada com o messageId informado."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "calls",
    name: "Ligações",
    description: "Endpoints para campanhas de ligação telefônica",
    endpoints: [
      {
        id: "call-dial",
        method: "POST",
        path: "/call-dial",
        description: "Inicia uma ligação telefônica para um lead de uma campanha. O endpoint busca a campanha pelo nome, valida o lead e registra a ligação no sistema.",
        attributes: [
          {
            name: "campaign_name",
            type: "string",
            required: true,
            description: "Nome exato da campanha de ligação"
          },
          {
            name: "lead_phone",
            type: "string",
            required: true,
            description: "Telefone do lead com DDI (mínimo 10 dígitos, ex: 5512983195531)"
          },
          {
            name: "lead_name",
            type: "string",
            required: false,
            description: "Nome do lead para identificação"
          },
          {
            name: "obs",
            type: "string",
            required: false,
            description: "Observações iniciais sobre a ligação (exibidas ao operador)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/call-dial" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "campaign_name": "FN | Carrinho Abandonado",
    "lead_phone": "5512983195531",
    "lead_name": "Ebonocleiton",
    "obs": "Cliente VIP - tratar com prioridade"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/call-dial',
  {
    campaign_name: 'FN | Carrinho Abandonado',
    lead_phone: '5512983195531',
    lead_name: 'Ebonocleiton',
    obs: 'Cliente VIP - tratar com prioridade'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/call-dial',
    json={
        'campaign_name': 'FN | Carrinho Abandonado',
        'lead_phone': '5512983195531',
        'lead_name': 'Ebonocleiton',
        'obs': 'Cliente VIP - tratar com prioridade'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 201,
            body: {
              success: true,
              call_id: "uuid-da-ligacao",
              status: "dialing",
              campaign: {
                id: "uuid-da-campanha",
                name: "FN | Carrinho Abandonado"
              },
              lead: {
                id: "uuid-do-lead",
                phone: "5512983195531",
                name: "Ebonocleiton"
              },
              operator: {
                id: "uuid-do-operador",
                name: "João Silva",
                extension: "1001"
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: "campaign_not_found",
              message: "Campanha 'FN | Carrinho Abandonado' não encontrada"
            }
          }
        }
      },
      {
        id: "call-status",
        method: "POST",
        path: "/call-status",
        description: "Atualiza o status de uma ligação telefônica. Se a ligação não existir pelo external_call_id, pode criar um novo registro se informar campaign_name e lead_phone.",
        statusCodes: [
          { code: "dialing", description: "Em ligação" },
          { code: "answered", description: "Atendida" },
          { code: "ended", description: "Concluída" },
          { code: "busy", description: "Ocupado" },
          { code: "not_found", description: "Número não encontrado" },
          { code: "voicemail", description: "Caixa postal" },
          { code: "cancelled", description: "Cancelamento da ligação" },
          { code: "timeout", description: "Tempo expirado" },
          { code: "error", description: "Falhou" },
        ],
        attributes: [
          {
            name: "external_call_id",
            type: "string",
            required: true,
            description: "ID externo da ligação (retornado pela API4com)"
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "Status da ligação: 'dialing', 'answered', 'ended', 'busy', 'not_found', 'voicemail', 'cancelled', 'timeout' ou 'error'"
          },
          {
            name: "campaign_name",
            type: "string",
            required: false,
            description: "Nome da campanha (obrigatório para criar nova ligação)"
          },
          {
            name: "lead_phone",
            type: "string",
            required: false,
            description: "Telefone do lead (obrigatório para criar nova ligação)"
          },
          {
            name: "lead_name",
            type: "string",
            required: false,
            description: "Nome do lead"
          },
          {
            name: "duration_seconds",
            type: "number",
            required: false,
            description: "Duração da ligação em segundos"
          },
          {
            name: "error_message",
            type: "string",
            required: false,
            description: "Mensagem de erro (quando status é 'error', 'not_found', 'voicemail' ou 'timeout')"
          },
          {
            name: "audio_url",
            type: "string",
            required: false,
            description: "URL da gravação da chamada (facultativo)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/call-status" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "external_call_id": "0548b46f-326a-472e-aa02-06c53269c361",
    "status": "ended",
    "duration_seconds": 120,
    "audio_url": "https://example.com/recordings/call-123.mp3"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/call-status',
  {
    external_call_id: '0548b46f-326a-472e-aa02-06c53269c361',
    status: 'ended',
    duration_seconds: 120,
    audio_url: 'https://example.com/recordings/call-123.mp3'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/call-status',
    json={
        'external_call_id': '0548b46f-326a-472e-aa02-06c53269c361',
        'status': 'ended',
        'duration_seconds': 120,
        'audio_url': 'https://example.com/recordings/call-123.mp3'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              call_id: "uuid-interno",
              external_call_id: "0548b46f-326a-472e-aa02-06c53269c361",
              status: "ended",
              duration_seconds: 120
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: "call_not_found",
              message: "Ligação não encontrada e dados insuficientes para criar"
            }
          }
        }
      }
    ]
  },
  {
    id: "leads",
    name: "Leads",
    description: "Endpoints para cadastro e gerenciamento de leads",
    endpoints: [
      {
        id: "create-lead",
        method: "POST",
        path: "/leads-api/leads",
        description: "Cadastra um novo lead, com possibilidade de atribuí-lo diretamente a uma campanha.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "name",
            type: "string",
            required: false,
            description: "Nome do lead"
          },
          {
            name: "email",
            type: "string",
            required: false,
            description: "E-mail do lead"
          },
          {
            name: "tags",
            type: "string[]",
            required: false,
            description: "Lista de tags para categorização (ex: [\"cliente\", \"vip\"])"
          },
          {
            name: "active_campaign_id",
            type: "string",
            required: false,
            description: "UUID da campanha para atribuir o lead automaticamente"
          },
          {
            name: "active_campaign_type",
            type: "string",
            required: false,
            description: "Tipo da campanha: \"dispatch\", \"group\" ou \"call\""
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/leads-api/leads" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "name": "João Silva",
    "email": "joao@email.com",
    "tags": ["cliente", "vip"],
    "active_campaign_id": "uuid-da-campanha",
    "active_campaign_type": "dispatch"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/leads-api/leads',
  {
    phone: '5511999999999',
    name: 'João Silva',
    email: 'joao@email.com',
    tags: ['cliente', 'vip'],
    active_campaign_id: 'uuid-da-campanha',
    active_campaign_type: 'dispatch'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);

console.log(response.data);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/leads-api/leads',
    json={
        'phone': '5511999999999',
        'name': 'João Silva',
        'email': 'joao@email.com',
        'tags': ['cliente', 'vip'],
        'active_campaign_id': 'uuid-da-campanha',
        'active_campaign_type': 'dispatch'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)

print(response.json())`
        },
        responses: {
          success: {
            code: 201,
            body: {
              id: "uuid-do-lead",
              phone: "5511999999999",
              name: "João Silva",
              email: "joao@email.com",
              tags: ["cliente", "vip"],
              active_campaign_id: "uuid-da-campanha",
              active_campaign_type: "dispatch",
              status: "active",
              created_at: "2025-01-15T10:30:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              error: "duplicate key value violates unique constraint"
            }
          }
        }
      },
      {
        id: "import-leads",
        method: "POST",
        path: "/leads-api/leads/import",
        description: "Importa múltiplos leads de uma vez, com opções de atribuição padrão de campanha e atualização de duplicatas.",
        attributes: [
          {
            name: "leads",
            type: "array",
            required: true,
            description: "Array de objetos lead, cada um com phone (obrigatório), name, email, tags, campaign_id e campaign_type"
          },
          {
            name: "options",
            type: "object",
            required: false,
            description: "Opções de importação"
          },
          {
            name: "options.update_existing",
            type: "boolean",
            required: false,
            description: "Se true, atualiza leads duplicados em vez de ignorá-los (padrão: false)"
          },
          {
            name: "options.default_tags",
            type: "string[]",
            required: false,
            description: "Tags aplicadas a todos os leads importados"
          },
          {
            name: "options.default_campaign_id",
            type: "string",
            required: false,
            description: "UUID da campanha padrão para leads sem campaign_id individual"
          },
          {
            name: "options.default_campaign_type",
            type: "string",
            required: false,
            description: "Tipo da campanha padrão: \"dispatch\", \"group\" ou \"call\""
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/leads-api/leads/import" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "leads": [
      { "phone": "5511999999999", "name": "João Silva", "email": "joao@email.com", "tags": ["cliente"] },
      { "phone": "5511888888888", "name": "Maria Santos", "campaign_id": "uuid-campanha-especifica", "campaign_type": "call" },
      { "phone": "5511777777777", "name": "Pedro Souza" }
    ],
    "options": {
      "update_existing": true,
      "default_tags": ["importado", "lote-01"],
      "default_campaign_id": "uuid-da-campanha-padrao",
      "default_campaign_type": "dispatch"
    }
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/leads-api/leads/import',
  {
    leads: [
      { phone: '5511999999999', name: 'João Silva', email: 'joao@email.com', tags: ['cliente'] },
      { phone: '5511888888888', name: 'Maria Santos', campaign_id: 'uuid-campanha-especifica', campaign_type: 'call' },
      { phone: '5511777777777', name: 'Pedro Souza' }
    ],
    options: {
      update_existing: true,
      default_tags: ['importado', 'lote-01'],
      default_campaign_id: 'uuid-da-campanha-padrao',
      default_campaign_type: 'dispatch'
    }
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);

console.log(response.data);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/leads-api/leads/import',
    json={
        'leads': [
            {'phone': '5511999999999', 'name': 'João Silva', 'email': 'joao@email.com', 'tags': ['cliente']},
            {'phone': '5511888888888', 'name': 'Maria Santos', 'campaign_id': 'uuid-campanha-especifica', 'campaign_type': 'call'},
            {'phone': '5511777777777', 'name': 'Pedro Souza'}
        ],
        'options': {
            'update_existing': True,
            'default_tags': ['importado', 'lote-01'],
            'default_campaign_id': 'uuid-da-campanha-padrao',
            'default_campaign_type': 'dispatch'
        }
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)

print(response.json())`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              imported: 2,
              updated: 1,
              skipped: 0
            }
          },
          error: {
            code: 400,
            body: {
              error: "leads array is required"
            }
          }
        }
      }
    ]
  },
  {
    id: "pirate",
    name: "Pirata",
    description: "Endpoints para captura de leads via campanhas pirata (monitoramento de grupos WhatsApp)",
    endpoints: [
      {
        id: "pirate-leads-ingest",
        method: "POST" as const,
        path: "/pirate-leads-api",
        description: "Recebe leads capturados de grupos WhatsApp. Ideal para integração com n8n filtrando eventos GROUP_PARTICIPANT_INVITE. Aceita um array de leads.",
        attributes: [
          {
            name: "group.id",
            type: "string",
            required: true,
            description: "JID do grupo WhatsApp (ex: 120363425932296878-group)"
          },
          {
            name: "group.name",
            type: "string",
            required: false,
            description: "Nome do grupo WhatsApp"
          },
          {
            name: "lead.phone",
            type: "string",
            required: true,
            description: "Telefone real do lead no formato DDI+DDD+Número (ex: 5512982402981)"
          },
          {
            name: "lead.@lid",
            type: "string",
            required: false,
            description: "Identificador LID do WhatsApp (ex: 15041025855619@lid)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/pirate-leads-api" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '[
    {
      "group": {
        "name": "🎁 AULÃO HOJE 20H! #157",
        "id": "120363425932296878-group"
      },
      "lead": {
        "@lid": "15041025855619@lid",
        "phone": "5512982402981"
      }
    }
  ]'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/pirate-leads-api',
  [
    {
      group: {
        name: '🎁 AULÃO HOJE 20H! #157',
        id: '120363425932296878-group'
      },
      lead: {
        '@lid': '15041025855619@lid',
        phone: '5512982402981'
      }
    }
  ],
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/pirate-leads-api',
    json=[
        {
            'group': {
                'name': '🎁 AULÃO HOJE 20H! #157',
                'id': '120363425932296878-group'
            },
            'lead': {
                '@lid': '15041025855619@lid',
                'phone': '5512982402981'
            }
        }
    ],
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              processed: 1,
              total: 1,
              results: [
                {
                  group_id: "120363425932296878-group",
                  phone: "5512982402981",
                  status: "processed",
                  detail: "Campaign abc-123"
                }
              ]
            }
          },
          error: {
            code: 403,
            body: {
              error: "Invalid API key"
            }
          }
        }
      }
    ]
  }
];

export const eventTypes = [
  { id: "message.received", name: "message.received", description: "Mensagem recebida" },
  { id: "message.sent", name: "message.sent", description: "Mensagem enviada" },
  { id: "message.delivered", name: "message.delivered", description: "Mensagem entregue" },
  { id: "message.read", name: "message.read", description: "Mensagem lida" },
  { id: "message.failed", name: "message.failed", description: "Falha no envio" },
  { id: "status.online", name: "status.online", description: "Contato online" },
  { id: "status.offline", name: "status.offline", description: "Contato offline" },
  { id: "status.typing", name: "status.typing", description: "Contato digitando" },
  { id: "connection.connected", name: "connection.connected", description: "Instância conectada" },
  { id: "connection.disconnected", name: "connection.disconnected", description: "Instância desconectada" },
  { id: "connection.qr_updated", name: "connection.qr_updated", description: "QR Code atualizado" }
];
