# Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy ONLY the pom first to cache dependencies (Faster Builds)
COPY backend-java/pom.xml ./backend-java/
RUN mvn -f backend-java/pom.xml dependency:go-offline

# Now copy the source and build
COPY backend-java/src ./backend-java/src
RUN mvn -f backend-java/pom.xml clean package -DskipTests

# Run Stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/backend-java/target/nexus-connect-0.0.1-SNAPSHOT.jar app.jar

# Explicitly tell the container which ports to open
EXPOSE 8080
EXPOSE 9092

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
