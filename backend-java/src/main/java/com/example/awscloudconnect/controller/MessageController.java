package com.example.awscloudconnect.controller;

import com.example.awscloudconnect.model.Message;
import com.example.awscloudconnect.model.Room;
import com.example.awscloudconnect.repository.MessageRepository;
import com.example.awscloudconnect.repository.RoomRepository;
import com.example.awscloudconnect.repository.UserRepository;
import com.example.awscloudconnect.service.SocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
        RequestMethod.GET, RequestMethod.DELETE, RequestMethod.OPTIONS
})
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SocketService socketService;

    /** Fetch all approved messages for a given room code (for the admin panel). */
    @GetMapping("/approved/{roomCode}")
    public ResponseEntity<?> getApprovedMessages(@PathVariable("roomCode") String roomCode) {
        Room room = roomRepository.findByRoomCode(roomCode.trim().toUpperCase()).orElse(null);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        List<Message> approved = messageRepository.findByRoomIdAndStatusOrderByCreatedAtAsc(room.getId(), "approved");
        // Populate sender details
        for (Message msg : approved) {
            if (msg.getSenderId() != null) {
                userRepository.findById(msg.getSenderId()).ifPresent(msg::setSender);
            }
        }
        return ResponseEntity.ok(approved);
    }

    /** Delete a message by ID and notify all connected clients via socket. */
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable("id") String id) {
        return messageRepository.findById(id).map(message -> {
            String roomId = message.getRoomId();
            messageRepository.delete(message);
            // Broadcast deletion so chat, broadcast, and admin panels update in real-time
            if (roomId != null) {
                roomRepository.findById(roomId)
                        .ifPresent(room -> socketService.broadcastMessageDeleted(id, room.getRoomCode()));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Message deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
