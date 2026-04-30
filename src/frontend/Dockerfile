FROM httpd:2.4.66-alpine3.23

COPY . /usr/local/apache2/htdocs

COPY apache-config.conf /usr/local/apache2/conf/sportsync.conf

RUN rm -rf /usr/local/apache2/htdocs/Dockerfile

RUN rm -rf /usr/local/apache2/htdocs/apache-config.conf

RUN rm -rf /usr/local/apache2/htdocs/index.html

RUN echo "Include conf/sportsync.conf" >> /usr/local/apache2/conf/httpd.conf

EXPOSE 81