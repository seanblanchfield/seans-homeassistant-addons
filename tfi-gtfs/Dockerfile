ARG BUILD_FROM=ghcr.io/hassio-addons/base:14.1.0
FROM $BUILD_FROM

ARG DATA_DIR=/data
ENV DATA_DIR=${DATA_DIR}

ARG SOURCE_ZIP_URL=https://github.com/seanblanchfield/tfi-gtfs/archive/refs/heads/main.zip

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
RUN wget $SOURCE_ZIP_URL
RUN unzip main.zip
RUN rm main.zip
RUN mv tfi-gtfs-main/* .

# Remove the dockerfile from the source code repo to avoid confusion
# with this dockerfile.
RUN rm Dockerfile

RUN python3 -m pip install -r requirements.txt

# Copy data for add-on
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
