ARG BUILD_FROM=ghcr.io/hassio-addons/base:14.1.0
FROM $BUILD_FROM

ARG DATA_DIR=/data
ENV DATA_DIR=${DATA_DIR}

ARG SOURCE_REV=9166f0b4ee58fb91b6823ccdf6bba81dcf089ba1
ARG SOURCE_ZIP_URL=https://github.com/seanblanchfield/tfi-gtfs/archive/${SOURCE_REV}.zip

# Install requirements for add-on
RUN \
  apk add --no-cache \
    python3 \
    py3-pip \
    redis \
    wget \
    unzip

WORKDIR /app

# Get the python app and install dependencies
RUN wget -O source.zip "$SOURCE_ZIP_URL" \
    && unzip -q source.zip \
    && rm source.zip \
    && mv tfi-gtfs-*/* .

# Remove the dockerfile from the source code repo to avoid confusion
# with this dockerfile.
RUN rm Dockerfile

RUN python3 -m venv /app/venv
RUN /app/venv/bin/python -m pip install -r requirements.txt

# Copy data for add-on
COPY run.sh check-redis-cache.sh /
RUN chmod a+x /run.sh /check-redis-cache.sh

CMD [ "/run.sh" ]
