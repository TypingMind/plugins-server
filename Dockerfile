FROM node:current-slim AS builder

# Define User ID and Group ID which the Server should run under
# Should be specified on buld, therfor buildargs
ARG UID=3000
ARG GID=3000

# Set the WORKDIR
# also make it simple so it can not be confused with system files
WORKDIR /app

# copy the whole repo into the container because all
# required files are stored on the project root
COPY --chown=$UID:$GID . .

# run npm install and build as root
# because npm and node store some files und /root for some reason
RUN npm ci && npm run build \
    && chown -R $UID:$GID /app # change permission to the specified UID and GID after finish

FROM node:current-slim AS prod

ARG UID=3000
ARG GID=3000

# set default env variable for prod
ENV NODE_ENV="production"
ENV PORT="8080"
ENV HOST="0.0.0.0"

WORKDIR /app

# copy the dist folder from the previous stage
COPY --from=builder --chown=$UID:$GID /app/dist /app/dist
# we also need the package.json and package-lock.json for the deps
COPY --from=builder /app/package*.json /app/

# reinstall all prod dependencies (this also needs to run as root)
# skip scripts (prepare script) because it uses a dev dependency
RUN npm ci --omit=dev --ignore-scripts \
    && chown -R $UID:$GID /app # correct permissions

# Drop user to the defined uid and gid
USER $UID:$GID

# define which port will be exposed
# this can be build with a build argument
EXPOSE 8080

# run server via direct call
# becuase npm run start requires a dev dependency
CMD ["dist/index.js"]
