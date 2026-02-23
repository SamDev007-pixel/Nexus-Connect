# Build Stage
FROM maven:3.8.5-openjdk-17-slim AS build
WORKDIR /app
COPY . .
WORKDIR /app/backend-java
RUN mvn clean package -DskipTests

# Run Stage
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/backend-java/target/nexus-connect-0.0.1-SNAPSHOT.jar app.jar

# Explicitly tell the container which ports to open
EXPOSE 8080
EXPOSE 9092

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
