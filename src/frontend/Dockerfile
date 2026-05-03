FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY src/frontend/nginx.conf /etc/nginx/conf.d/

# Copy static assets and frontend code
COPY src/frontend /usr/share/nginx/html/frontend
COPY src/assets /usr/share/nginx/html/assets

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
