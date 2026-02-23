package com.example.awscloudconnect.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.listener.ConnectListener;
import com.corundumstudio.socketio.listener.DataListener;
import com.corundumstudio.socketio.listener.DisconnectListener;
import com.example.awscloudconnect.model.Message;
import com.example.awscloudconnect.model.Room;
import com.example.awscloudconnect.model.User;
import com.example.awscloudconnect.repository.MessageRepository;
import com.example.awscloudconnect.repository.RoomRepository;
import com.example.awscloudconnect.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class SocketService {

    @Autowired
    private SocketIOServer server;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @PostConstruct
    public void init() {
        server.addConnectListener(onConnected());
        server.addDisconnectListener(onDisconnected());

        server.addEventListener("join_room", (Class<Map<String, Object>>) (Class) Map.class, onJoinRoom());
        server.addEventListener("send_message", (Class<Map<String, Object>>) (Class) Map.class, onSendMessage());
        server.addEventListener("approve_message", (Class<Map<String, Object>>) (Class) Map.class, onApproveMessage());
        server.addEventListener("approve_user", (Class<Map<String, Object>>) (Class) Map.class, onApproveUser());
        server.addEventListener("kick_user", (Class<Map<String, Object>>) (Class) Map.class, onKickUser());
        server.addEventListener("delete_room", (Class<Map<String, Object>>) (Class) Map.class, onDeleteRoom());
        server.addEventListener("leave_room", (Class<Map<String, Object>>) (Class) Map.class, onLeaveRoom());
        server.addEventListener("get_pending_messages", (Class<Map<String, Object>>) (Class) Map.class,
                onGetPendingMessages());

        server.start();
        log.info("Socket.IO server started at port {}", server.getConfiguration().getPort());
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.stop();
        }
    }

    private ConnectListener onConnected() {
        return client -> {
            log.info("Client connected: {}", client.getSessionId());
        };
    }

    private DisconnectListener onDisconnected() {
        return client -> {
            log.info("Client disconnected: {}", client.getSessionId());
            userRepository.findBySocketId(client.getSessionId().toString()).ifPresent(user -> {
                user.setOnline(false);
                user.setSocketId(null);
                userRepository.save(user);

                // Notify superadmins of the update
                Room room = roomRepository.findById(user.getRoom()).orElse(null);
                if (room != null) {
                    broadcastLiveUsers(room.getId(), room.getRoomCode());
                }
            });
        };
    }

    private void broadcastLiveUsers(String roomId, String roomCode) {
        List<User> liveUsers = userRepository.findByRoomAndStatusAndOnline(roomId, "approved", true);
        server.getRoomOperations("room_" + roomCode.toUpperCase()).sendEvent("superadmin_live_users", liveUsers);
    }

    private DataListener<Map<String, Object>> onJoinRoom() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String roomCode = (String) mapData.get("roomCode");
            String role = (String) mapData.get("role");
            String userId = (String) mapData.get("userId");
            String password = (String) mapData.get("password");

            if (roomCode == null)
                return;

            // Security Validation for Elevated Roles
            if ("superadmin".equals(role)) {
                if (!"NEXUS@ROOT".equals(password)) {
                    client.sendEvent("auth_failed", "Invalid SuperAdmin Credentials");
                    return;
                }
            } else if ("admin".equals(role)) {
                if (!"NEXUS@MOD".equals(password)) {
                    client.sendEvent("auth_failed", "Invalid Admin Access Key");
                    return;
                }
            } else if ("broadcast".equals(role)) {
                if (!"NEXUS@FEED".equals(password)) {
                    client.sendEvent("auth_failed", "Invalid Stream Authorization");
                    return;
                }
            }

            String formattedCode = roomCode.trim().toUpperCase();
            Room room = roomRepository.findByRoomCode(formattedCode).orElse(null);

            if (room == null) {
                client.sendEvent("room_not_found");
                return;
            }

            client.joinRoom(formattedCode);
            client.joinRoom("room_" + formattedCode);

            System.out.println(
                    "DEBUG: Client " + client.getSessionId() + " joined room_" + formattedCode + " as " + role);

            if (userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    user.setOnline(true);
                    user.setSocketId(client.getSessionId().toString());
                    userRepository.save(user);

                    // If user is already approved (e.g. from a previous session or while offline),
                    // tell them to move to the approved state in the UI.
                    if ("approved".equals(user.getStatus())) {
                        client.sendEvent("user_approved", user.getId());
                    }
                });
            }

            if ("user".equals(role)) {
                List<Message> messages = messageRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
                populateMessages(messages);
                client.sendEvent("load_messages", messages);
                // Notify admins that someone is waiting
                server.getRoomOperations("room_" + formattedCode).sendEvent("refresh_user_lists");
            } else if ("admin".equals(role)) {
                List<Message> pending = messageRepository.findByRoomIdAndStatusOrderByCreatedAtAsc(room.getId(),
                        "pending");
                populateMessages(pending);
                client.sendEvent("load_pending_messages", pending);
            } else if ("broadcast".equals(role)) {
                client.joinRoom("broadcast_" + formattedCode);
                List<Message> approved = messageRepository.findByRoomIdAndStatusOrderByCreatedAtAsc(room.getId(),
                        "approved");
                populateMessages(approved);
                client.sendEvent("load_broadcast_messages", approved);
            } else if ("superadmin".equals(role)) {
                broadcastLiveUsers(room.getId(), formattedCode);
                // Also give them the current pending count trigger
                client.sendEvent("refresh_user_lists");
            }

            // Notify superadmins of the new connection
            broadcastLiveUsers(room.getId(), formattedCode);
            log.info("Role {} joined room {}. UserID: {}", role, formattedCode, userId);
        };
    }

    private DataListener<Map<String, Object>> onSendMessage() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String userId = (String) mapData.get("userId");
            String roomCode = (String) mapData.get("roomCode");
            String content = (String) mapData.get("content");

            if (content == null || content.trim().isEmpty())
                return;

            String formattedCode = (roomCode != null) ? roomCode.trim().toUpperCase() : "";
            Room room = roomRepository.findByRoomCode(formattedCode).orElse(null);
            if (room == null) {
                System.out.println("DEBUG: send_message failed - Room not found: " + formattedCode);
                return;
            }

            User sender = userRepository.findById(userId).orElse(null);
            if (sender == null) {
                System.out.println("DEBUG: send_message failed - Sender not found: " + userId);
                return;
            }

            Message message = new Message();
            message.setRoomId(room.getId());
            message.setSenderId(sender.getId());
            message.setSenderUsername(sender.getUsername());
            message.setContent(content.trim());
            message.setStatus("pending");
            Message savedMessage = messageRepository.save(message);

            System.out.println("DEBUG: Message saved. ID: " + savedMessage.getId() + ", Room: " + formattedCode
                    + ", content: " + content);

            // Populate for real-time emission
            savedMessage.setSender(sender);

            System.out.println("DEBUG: Emitting message to room_" + formattedCode);

            // Send to everyone in the chat room immediately (since only approved users can
            // chat)
            server.getRoomOperations("room_" + formattedCode).sendEvent("receive_message", savedMessage);

            // Also send to admins/moderators in the room for broadcast approval
            server.getRoomOperations("room_" + formattedCode).sendEvent("new_pending_message", savedMessage);
        };
    }

    private DataListener<Map<String, Object>> onApproveMessage() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String messageId = (String) mapData.get("messageId");
            messageRepository.findById(messageId).ifPresent(message -> {
                message.setStatus("approved");
                messageRepository.save(message);

                if (message.getRoomId() != null) {
                    roomRepository.findById(message.getRoomId()).ifPresent(room -> {
                        String roomCode = room.getRoomCode().toUpperCase();
                        // Populate sender for display
                        userRepository.findById(message.getSenderId()).ifPresent(message::setSender);

                        server.getRoomOperations("broadcast_" + roomCode).sendEvent("broadcast_message", message);
                        server.getRoomOperations("room_" + roomCode).sendEvent("receive_message", message);
                        server.getRoomOperations("room_" + roomCode).sendEvent("message_approved", message);
                    });
                }
            });
        };
    }

    private DataListener<Map<String, Object>> onApproveUser() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String userId = (String) mapData.get("userId");
            String roomCode = (String) mapData.get("roomCode");
            approveUser(userId, roomCode);
        };
    }

    public void approveUser(String userId, String roomCode) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setStatus("approved");
            userRepository.save(user);

            if (roomCode != null) {
                String formatted = roomCode.toUpperCase();
                server.getRoomOperations("room_" + formatted).sendEvent("user_approved", userId);
                server.getRoomOperations("room_" + formatted).sendEvent("refresh_user_lists");
            }
        });
    }

    private DataListener<Map<String, Object>> onKickUser() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String userId = (String) mapData.get("userId");
            String roomCode = (String) mapData.get("roomCode");
            kickUser(userId, roomCode);
        };
    }

    public void kickUser(String userId, String roomCode) {
        log.info("Kick Request - User: {}, Room: {}", userId, roomCode);
        userRepository.findById(userId).ifPresentOrElse(user -> {
            String roomId = user.getRoom();
            log.info("Deleting User: {} from Room: {}", user.getUsername(), roomId);

            // "Remove completely" from DB
            messageRepository.deleteBySenderId(userId);
            userRepository.deleteById(userId);

            // Notify about the kick and trigger UI refresh for all admins
            if (roomId != null) {
                roomRepository.findById(roomId).ifPresent(room -> {
                    String rCode = room.getRoomCode().toUpperCase();
                    server.getRoomOperations("room_" + rCode).sendEvent("user_kicked", userId);
                    server.getRoomOperations("room_" + rCode).sendEvent("refresh_user_lists");
                    broadcastLiveUsers(roomId, rCode);
                });
            } else if (roomCode != null) {
                String formatted = roomCode.toUpperCase();
                server.getRoomOperations("room_" + formatted).sendEvent("user_kicked", userId);
                server.getRoomOperations("room_" + formatted).sendEvent("refresh_user_lists");

                roomRepository.findByRoomCode(formatted).ifPresent(r -> {
                    broadcastLiveUsers(r.getId(), formatted);
                });
            }
        }, () -> log.warn("Kick Failed - User {} not found", userId));
    }

    private DataListener<Map<String, Object>> onDeleteRoom() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String roomCode = (String) mapData.get("roomCode");
            deleteRoom(roomCode);
        };
    }

    public void deleteRoom(String roomCode) {
        if (roomCode == null)
            return;

        String formattedCode = roomCode.trim().toUpperCase();
        roomRepository.findByRoomCode(formattedCode).ifPresent(room -> {
            userRepository.deleteAll(userRepository.findByRoom(room.getId()));
            messageRepository.deleteByRoomId(room.getId());
            roomRepository.delete(room);

            server.getRoomOperations("room_" + formattedCode).sendEvent("room_deleted");
        });
    }

    private DataListener<Map<String, Object>> onLeaveRoom() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String userId = (String) mapData.get("userId");
            String roomCode = (String) mapData.get("roomCode");

            log.info("User {} leaving room {}", userId, roomCode);

            if (userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    String roomId = user.getRoom();
                    log.info("User {} logging out from room {}. Deleting...", user.getUsername(), roomId);

                    // "Remove completely" from everything on logout
                    userRepository.deleteById(userId);

                    Room room = roomRepository.findById(roomId).orElse(null);
                    if (room != null) {
                        broadcastLiveUsers(room.getId(), room.getRoomCode());
                        server.getRoomOperations("room_" + room.getRoomCode().toUpperCase())
                                .sendEvent("refresh_user_lists");
                    }
                });
            }
            if (roomCode != null) {
                String formatted = roomCode.toUpperCase();
                client.leaveRoom(formatted);
                client.leaveRoom("room_" + formatted);
                client.leaveRoom("broadcast_" + formatted);
                server.getRoomOperations("room_" + formatted).sendEvent("refresh_user_lists");
            }
        };
    }

    /** Emits message_deleted to all channels so every UI updates immediately. */
    public void broadcastMessageDeleted(String messageId, String roomCode) {
        if (roomCode == null)
            return;
        String formatted = roomCode.trim().toUpperCase();
        server.getRoomOperations("room_" + formatted).sendEvent("message_deleted", messageId);
        server.getRoomOperations("broadcast_" + formatted).sendEvent("message_deleted", messageId);
    }

    /**
     * Sends only pending messages back to the requesting admin client (no join
     * side-effects).
     */
    private DataListener<Map<String, Object>> onGetPendingMessages() {
        return (client, data, ackSender) -> {
            Map<String, Object> mapData = (Map<String, Object>) data;
            String roomCode = (String) mapData.get("roomCode");
            if (roomCode == null)
                return;
            String formattedCode = roomCode.trim().toUpperCase();
            roomRepository.findByRoomCode(formattedCode).ifPresent(room -> {
                List<Message> pending = messageRepository.findByRoomIdAndStatusOrderByCreatedAtAsc(room.getId(),
                        "pending");
                populateMessages(pending);
                client.sendEvent("load_pending_messages", pending);
            });
        };
    }

    private void populateMessages(List<Message> messages) {
        System.out.println("DEBUG: Populating " + messages.size() + " messages");
        for (Message msg : messages) {
            if (msg.getSenderId() != null) {
                userRepository.findById(msg.getSenderId()).ifPresent(u -> {
                    msg.setSender(u);
                    System.out.println("DEBUG: Populated sender " + u.getUsername() + " for message " + msg.getId());
                });
            } else {
                System.out.println("DEBUG: Message " + msg.getId() + " has null senderId");
            }
        }
    }
}
