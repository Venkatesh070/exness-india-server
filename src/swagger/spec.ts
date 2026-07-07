import type { OpenAPIV3 } from "openapi-types";

const errorResponse: OpenAPIV3.ResponseObject = {
  description: "Error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
    },
  },
};

export function buildSwaggerSpec(port: number): OpenAPIV3.Document {
  return {
    openapi: "3.0.0",
    info: {
      title: "Exness India API",
      version: "2.0.0",
      description: "Trading platform authentication and onboarding API",
    },
    servers: [{ url: `http://localhost:${port}` }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Profile" },
      { name: "KYC" },
      { name: "Bank" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: {
            "200": {
              description: "Service healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      service: { type: "string" },
                      database: { type: "string" },
                      email: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/send-otp": {
        post: {
          tags: ["Auth"],
          summary: "Send registration OTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: {
                      type: "string",
                      minLength: 8,
                      description: "Must include uppercase, lowercase, and a number",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OTP sent" },
            "409": errorResponse,
            "502": errorResponse,
          },
        },
      },
      "/api/auth/verify-otp": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP and create account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "otp"],
                  properties: {
                    email: { type: "string", format: "email" },
                    otp: { type: "string", example: "123456" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Account created, returns tokens" },
            "400": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/auth/resend-otp": {
        post: {
          tags: ["Auth"],
          summary: "Resend registration OTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OTP resent" },
            "400": errorResponse,
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    rememberMe: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful" },
            "401": errorResponse,
            "403": errorResponse,
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "New access token" },
            "401": errorResponse,
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Logged out" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Current user profile" },
            "401": errorResponse,
          },
        },
      },
      "/api/profile": {
        get: {
          tags: ["Profile"],
          summary: "Get profile",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "User profile" },
            "401": errorResponse,
          },
        },
        put: {
          tags: ["Profile"],
          summary: "Update profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    dob: { type: "string", example: "1990-01-15" },
                    gender: { type: "string", enum: ["male", "female", "other"] },
                    occupation: { type: "string" },
                    income: { type: "string" },
                    address: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Profile updated" },
            "401": errorResponse,
          },
        },
      },
      "/api/kyc": {
        get: {
          tags: ["KYC"],
          summary: "Get KYC status",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "KYC record" },
            "401": errorResponse,
          },
        },
      },
      "/api/kyc/pan": {
        put: {
          tags: ["KYC"],
          summary: "Submit PAN",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pan"],
                  properties: {
                    pan: { type: "string", example: "ABCDE1234F" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "PAN saved" },
            "401": errorResponse,
          },
        },
      },
      "/api/kyc/aadhaar": {
        put: {
          tags: ["KYC"],
          summary: "Submit Aadhaar reference",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["aadhaarReference"],
                  properties: {
                    aadhaarReference: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Aadhaar reference saved" },
            "401": errorResponse,
          },
        },
      },
      "/api/kyc/selfie": {
        post: {
          tags: ["KYC"],
          summary: "Upload selfie",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["selfie"],
                  properties: {
                    selfie: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Selfie uploaded" },
            "401": errorResponse,
          },
        },
      },
      "/api/bank": {
        get: {
          tags: ["Bank"],
          summary: "List bank accounts",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Bank accounts" },
            "401": errorResponse,
          },
        },
        post: {
          tags: ["Bank"],
          summary: "Add bank account",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["bankName", "accountHolder", "accountNumber", "confirmAccountNumber", "ifsc"],
                  properties: {
                    bankName: { type: "string" },
                    accountHolder: { type: "string" },
                    accountNumber: { type: "string" },
                    confirmAccountNumber: { type: "string" },
                    ifsc: { type: "string", example: "HDFC0001234" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Bank account added" },
            "401": errorResponse,
          },
        },
      },
      "/api/bank/{id}/verify": {
        post: {
          tags: ["Bank"],
          summary: "Verify bank account",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Bank account verified" },
            "401": errorResponse,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}
