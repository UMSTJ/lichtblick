mod file_ops; // 假设移动端也需要这些文件操作命令
mod udp_listener; // 引入 udp_listener 模块

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(udp_listener::UdpListenerState::new()) // 为移动端添加状态管理
        .invoke_handler(tauri::generate_handler![
            // 如果移动端也需要这些命令，请取消注释或添加
            // file_ops::save_file,
            // file_ops::read_file,
            // file_ops::list_files,
            // file_ops::delete_file_item,
            // file_ops::file_item_exists,
            // file_ops::get_file_item_stats,
            udp_listener::start_udp_listener,
            udp_listener::stop_udp_listener
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
