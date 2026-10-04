FROM node:22.22.0-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash python3 git coreutils \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/musae /workspace \
    && chown 1000:1000 /workspace

COPY files.py /opt/musae/files.py
RUN chmod 0555 /opt/musae/files.py

ENV HOME=/workspace LANG=C.UTF-8
WORKDIR /workspace
USER 1000:1000
VOLUME ["/workspace"]
ENTRYPOINT ["/usr/bin/sleep"]
CMD ["infinity"]
