package com.example.awscloudconnect.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "rooms")
public class Room {
    @Id
    private String id;

    @Indexed(unique = true)
    private String roomCode;

    private String name;

    private String createdBy; // Reference to User ID

    private LocalDateTime createdAt = LocalDateTime.now();
}
