FROM httpd:2.4.66-alpine3.23

COPY . /usr/local/apache2/htdocs

RUN rm -rf /usr/local/apache2/htdocs/Dockerfile

RUN rm -rf /usr/local/apache2/htdocs/index.html

EXPOSE 80