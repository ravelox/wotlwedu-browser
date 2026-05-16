# Build stage
FROM node:20-alpine AS build

WORKDIR /app
ARG VITE_WOTLWEDU_API_BASE_URL=https://api.wotlwedu.com:9876
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_APP_VERSION
ENV VITE_WOTLWEDU_API_BASE_URL=$VITE_WOTLWEDU_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_APP_VERSION=$VITE_APP_VERSION

COPY package*.json ./
RUN npm ci

COPY . .
RUN VITE_APP_VERSION="${VITE_APP_VERSION:-$(node -p "require('./package.json').version")}" npm run build

# Runtime stage
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
