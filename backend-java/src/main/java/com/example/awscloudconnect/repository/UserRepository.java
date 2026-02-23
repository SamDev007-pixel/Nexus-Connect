package com.example.awscloudconnect.repository;

import com.example.awscloudconnect.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findBySocketId(String socketId);

    List<User> findByRoomAndStatus(String room, String status);

    List<User> findByRoomAndStatusAndOnline(String room, String status, boolean online);

    List<User> findByRoom(String room);
}
