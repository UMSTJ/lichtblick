// src-tauri/src/udp_listener.rs
use tauri::Manager; // 用于 app_handle 和 window.emit
use std::net::UdpSocket;
use std::sync::Mutex;
use tauri::Emitter; // <--- Add this line
use tokio::sync::oneshot;
use std::io::ErrorKind; // 用于检查 WouldBlock

// 用于管理 UDP 监听器任务的状态
pub struct UdpListenerState {
    stop_sender: Mutex<Option<oneshot::Sender<()>>>,
}

impl UdpListenerState {
    pub fn new() -> Self {
        Self {
            stop_sender: Mutex::new(None),
        }
    }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UdpMessage {
  data: String,
  source_address: String,
}

#[tauri::command]
pub async fn start_udp_listener<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    port: u16,
) -> Result<(), String> {
    let state = app_handle.state::<UdpListenerState>();
    let mut stop_sender_guard = state.stop_sender.lock().unwrap();

    if stop_sender_guard.is_some() {
        return Err("UDP 监听器已在运行。请先停止它。".to_string());
    }

    let (tx, mut rx) = oneshot::channel::<()>();
    *stop_sender_guard = Some(tx);
    drop(stop_sender_guard);

    let socket = match UdpSocket::bind(format!("0.0.0.0:{}", port)) {
        Ok(s) => s,
        Err(e) => return Err(format!("绑定 UDP 套接字失败: {}", e)),
    };

    // Set the socket to non-blocking mode
    if let Err(e) = socket.set_nonblocking(true) {
        return Err(format!("设置 UDP 套接字为非阻塞模式失败: {}", e));
    }

    println!("UDP 监听器已在端口 {} 启动", port);
    let app_handle_clone = app_handle.clone();
    // Spawn a blocking task to handle the UDP receive loop
    tokio::task::spawn_blocking(move || {
        let mut buf = [0u8; 1024]; // Receive buffer

        loop {
            // Check for stop signal without blocking the loop indefinitely
            match rx.try_recv() {
                Ok(_) => {
                    println!("UDP 监听器收到停止信号，正在关闭。");
                    break; // Exit the loop
                }
                Err(oneshot::error::TryRecvError::Empty) => {
                    // No stop signal yet, continue
                }
                Err(oneshot::error::TryRecvError::Closed) => {
                    // Sender was dropped, treat as stop signal
                    println!("UDP 监听器停止信号通道已关闭，正在关闭。");
                    break;
                }
            }

            // Attempt to receive data non-blocking
            match socket.recv_from(&mut buf) {
                Ok((number_of_bytes, src_addr)) => {
                    let received_data_bytes = &buf[..number_of_bytes];

                    // Attempt to decode as UTF-8 string
                    match String::from_utf8(received_data_bytes.to_vec()) {
                        Ok(data_string) => {
                            println!("从 {} 收到: {}", src_addr, data_string);

                            let message_payload = UdpMessage {
                                data: data_string,
                                source_address: src_addr.to_string(),
                            };

                            // Emit the message to the frontend
                            // Use app_handle_clone.emit for Tauri 2.0
                            if let Err(e) = app_handle_clone.emit("udp_message_received", message_payload) {
                                eprintln!("发送 UDP 消息到前端失败: {}", e);
                            }
                        }
                        Err(_) => {
                            // Data is not valid UTF-8, log a warning and skip
                            eprintln!("收到非 UTF-8 格式的 UDP 数据，已忽略。来源: {}", src_addr);
                        }
                    }
                }
                Err(ref e) if e.kind() == ErrorKind::WouldBlock => {
                    // No data available, wait a bit before checking again
                    // This prevents the loop from consuming 100% CPU
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
                Err(e) => {
                    // Other errors
                    eprintln!("接收 UDP 数据错误: {}", e);
                    // Decide how to handle other errors (e.g., break loop, continue)
                    // For now, we'll just log and continue, but a persistent error might warrant stopping.
                    std::thread::sleep(std::time::Duration::from_millis(100)); // Prevent tight loop on persistent error
                }
            }
        }

        // Task is stopping, clean up state
        let state_on_stop = app_handle_clone.state::<UdpListenerState>();
        let mut guard = state_on_stop.stop_sender.lock().unwrap();
        *guard = None;
        println!("UDP 监听器任务已完成。");
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_udp_listener<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let state = app_handle.state::<UdpListenerState>();
    let mut stop_sender_guard = state.stop_sender.lock().unwrap();

    if let Some(sender) = stop_sender_guard.take() {
        if sender.send(()).is_ok() {
            println!("停止信号已发送至 UDP 监听器。");
            Ok(())
        } else {
            // Sender might have already been dropped if the task finished on its own
            Err("发送停止信号失败。监听器可能已经停止。".to_string())
        }
    } else {
        Err("UDP 监听器未在运行。".to_string())
    }
}
