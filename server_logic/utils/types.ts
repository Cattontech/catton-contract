import { JWT } from "@fastify/jwt";
import { Role } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    jwt: JWT;
  }
}

// adding jwt property to req
// authenticate property to FastifyInstance
declare module "fastify" {
  interface FastifyRequest {
    jwt: JWT;
  }
  export interface FastifyInstance {
    authenticate: any;
    blockchainAuthenticate: any;
    checkAdminRole: any;
  }
}
type UserPayload = {
  userId: string;
  authenId: string;
  role: Role;
  createdAt: number;
};
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: UserPayload;
  }
}

