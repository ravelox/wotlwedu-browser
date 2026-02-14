# Build stage
FROM node:20-alpine AS build

WORKDIR /app
ARG VITE_WOTLWEDU_API_BASE_URL=https://api.wotlwedu.com:9876
ENV VITE_WOTLWEDU_API_BASE_URL=$VITE_WOTLWEDU_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
