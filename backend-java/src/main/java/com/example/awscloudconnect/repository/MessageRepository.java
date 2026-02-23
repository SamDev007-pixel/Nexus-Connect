package com.example.awscloudconnect.repository;

import com.example.awscloudconnect.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId);

    List<Message> findByRoomIdAndStatusOrderByCreatedAtAsc(String roomId, String status);

    void deleteByRoomId(String roomId);

    void deleteBySenderId(String senderId);
}
