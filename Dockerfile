# The image-optimizer toolchain (jpegtran-bin/optipng-bin, 2018-era) only ships x64 prebuilt
# binaries, so the image must be amd64. On Apple Silicon this runs under Rosetta emulation.
FROM --platform=linux/amd64 node:16-bullseye

EXPOSE 3001 3005

WORKDIR /shapez.io

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg default-jre \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* 

COPY package.json yarn.lock ./
RUN yarn

COPY gulp ./gulp
WORKDIR /shapez.io/gulp
RUN yarn

WORKDIR /shapez.io
COPY res ./res
COPY src/html ./src/html
COPY src/css ./src/css
COPY version ./version
COPY sync-translations.js ./
COPY translations ./translations
COPY src/js ./src/js
COPY res_raw ./res_raw
COPY .git ./.git
COPY electron ./electron

# Bake the LibGDX texture-packer jar (22MB) into the image so it is not downloaded at runtime.
WORKDIR /shapez.io/gulp
RUN curl -fsSL -o runnable-texturepacker.jar \
    https://libgdx-nightlies.s3.eu-central-1.amazonaws.com/libgdx-runnables/runnable-texturepacker.jar

# Pre-build the heavy assets (atlas packing + sound encoding) at image build time so that
# container startup only does the cheap copy/compile steps and serves much faster.
RUN yarn gulp build.assets.docker

ENTRYPOINT ["yarn", "gulp", "serve.web-localhost.fast"]
