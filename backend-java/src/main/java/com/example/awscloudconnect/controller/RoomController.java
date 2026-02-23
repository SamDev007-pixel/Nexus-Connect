package com.example.awscloudconnect.controller;

import com.example.awscloudconnect.model.Room;
import com.example.awscloudconnect.model.User;
import com.example.awscloudconnect.repository.RoomRepository;
import com.example.awscloudconnect.repository.UserRepository;
import com.example.awscloudconnect.service.SocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
        RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.OPTIONS })
public class RoomController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SocketService socketService;

    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String password = body.get("rootPassword"); // Get the root password from request

        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Room name is required"));
        }

        // Security Validation: Only authorized root users can command new room creation
        String trimmedPassword = (password != null) ? password.trim() : "";
        System.out.println("DEBUG: Room creation attempt with rootPassword: " + trimmedPassword);

        if (!"NEXUS@ROOT".equals(trimmedPassword)) {
            System.out.println("DEBUG: Authorization Failed for password: " + trimmedPassword);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authorization Protocol Failed. Invalid root credentials."));
        }
        System.out.println("DEBUG: Authorization Successful for room: " + name);

        String roomCode;
        do {
            roomCode = generateRoomCode();
        } while (roomRepository.findByRoomCode(roomCode).isPresent());

        Room room = new Room();
        room.setName(name);
        room.setRoomCode(roomCode);
        Room savedRoom = roomRepository.save(room);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Room created successfully");
        response.put("room", savedRoom);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinRoom(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String roomCode = body.get("roomCode");

        if (username == null || roomCode == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and Room Code are required"));
        }

        String formattedCode = roomCode.trim().toUpperCase();
        Room room = roomRepository.findByRoomCode(formattedCode)
                .orElse(null);

        if (room == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Room not found"));
        }

        User user = new User();
        user.setUsername(username);
        user.setRoom(room.getId());
        user.setStatus("pending");
        user.setRole("user");
        User savedUser = userRepository.save(user);

        System.out.println("DEBUG: User saved with ID: " + savedUser.getId() + " for room ID: " + room.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Join request sent. Waiting for approval.");
        response.put("user", savedUser);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{roomCode}/pending-users")
    public ResponseEntity<?> getPendingUsers(@PathVariable("roomCode") String roomCode) {
        Room room = roomRepository.findByRoomCode(roomCode.toUpperCase())
                .orElse(null);

        if (room == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Room not found"));
        }

        List<User> pendingUsers = userRepository.findByRoomAndStatus(room.getId(), "pending");
        System.out.println("DEBUG: Found " + pendingUsers.size() + " pending users for room roomID: " + room.getId());
        return ResponseEntity.ok(pendingUsers);
    }

    @GetMapping("/{roomCode}/all-users")
    public ResponseEntity<?> getAllUsers(@PathVariable("roomCode") String roomCode) {
        Room room = roomRepository.findByRoomCode(roomCode.toUpperCase())
                .orElse(null);

        if (room == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Room not found"));
        }

        List<User> allUsers = userRepository.findByRoomAndStatus(room.getId(), "approved");
        return ResponseEntity.ok(allUsers);
    }

    @PatchMapping("/approve-user/{userId}")
    public ResponseEntity<?> approveUser(@PathVariable("userId") String userId) {
        return userRepository.findById(userId).map(user -> {
            Room room = roomRepository.findById(user.getRoom()).orElse(null);
            String roomCode = (room != null) ? room.getRoomCode() : null;

            socketService.approveUser(user.getId(), roomCode);

            return ResponseEntity.ok(Map.of(
                    "message", "User approved successfully",
                    "user", user));
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found")));
    }

    @DeleteMapping("/kick-user/{userId}")
    public ResponseEntity<?> kickUser(@PathVariable("userId") String userId) {
        return userRepository.findById(userId).map(user -> {
            Room room = roomRepository.findById(user.getRoom()).orElse(null);
            String roomCode = (room != null) ? room.getRoomCode() : null;

            socketService.kickUser(user.getId(), roomCode);

            return ResponseEntity.ok(Map.of("message", "User kicked and removed successfully"));
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found")));
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        Random rnd = new Random();
        while (code.length() < 6) {
            int index = (int) (rnd.nextFloat() * chars.length());
            code.append(chars.charAt(index));
        }
        return code.toString();
    }
}
