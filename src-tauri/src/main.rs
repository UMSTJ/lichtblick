#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_ops;
mod udp_listener; // 如果你创建了 udp_listener.rs

fn main() {
    tauri::Builder::default() // 添加 shell 插件
        .manage(udp_listener::UdpListenerState::new()) // 添加状态管理
        .invoke_handler(tauri::generate_handler![
            file_ops::save_file,
            file_ops::read_file,
            file_ops::list_files,
            file_ops::delete_file_item,
            file_ops::file_item_exists,
            file_ops::get_file_item_stats,
            udp_listener::start_udp_listener,
            udp_listener::stop_udp_listener,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
