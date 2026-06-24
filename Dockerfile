FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# La site-key de hCaptcha se hornea en build (Vite). Default = test key (siempre válida).
# Para el registro público real, pasar la site-key de producción vía build-arg.
ARG VITE_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
ENV VITE_HCAPTCHA_SITE_KEY=$VITE_HCAPTCHA_SITE_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80