//! Prints frozen sizes so the TS mirror can assert the same numbers.

fn main() {
    println!("INTERFACE_VERSION={}", zeta_interface::INTERFACE_VERSION);
    println!("POOL_LEN={}", zeta_interface::POOL_LEN);
    println!("CREDIT_LINE_LEN={}", zeta_interface::CREDIT_LINE_LEN);
    println!("POLICY_LEN={}", zeta_interface::POLICY_LEN);
    println!("POLICY_ACL_LEN={}", zeta_interface::POLICY_ACL_LEN);
    println!("AUDIT_RECORD_LEN={}", zeta_interface::AUDIT_RECORD_LEN);
    println!("DRAW_ARGS_LEN={}", zeta_interface::DRAW_ARGS_LEN);
}
