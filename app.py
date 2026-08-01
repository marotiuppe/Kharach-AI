import hashlib
import io
import json
import os
import sqlite3

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import streamlit as st
from google import genai
from google.genai import types
from PIL import Image

DB_FILE = "kharach_ai.db"
UPLOADS_DIR = "uploads"

st.set_page_config(
    page_title="Kharach AI",
    page_icon="💡",
    layout="wide"
)

PROMPT_TEXT = """
Extract all line-item bank/UPI transactions from the provided document or image.
Return ONLY a valid JSON list of objects without any markdown formatting or extra commentary.

Each transaction object must strictly conform to this JSON schema:
[
  {
    "date": "YYYY-MM-DD",
    "recipient_or_sender": "Name or Merchant extracted from Particulars",
    "particulars_note": "Specific transaction notes (e.g., petrol, rent, bike servicing, jagga la pathavle)",
    "debit_amount": 0.0,
    "credit_amount": 0.0,
    "type": "DEBIT" or "CREDIT",
    "category": "Fuel" or "Rent/Housing" or "Shopping" or "ATM/Cash" or "Food/Groceries" or "EMIs/Loans" or "Transfers/Personal" or "Income" or "Bills/Recharge" or "Others"
  }
]

Parsing Rules:
1. Handle page breaks or incomplete entries gracefully.
2. Clean messy UPI handles into readable recipient names and specific notes (e.g., parse 'UPI/DR/657380366355/SANDEEP/SBIN/Bike Servicing' to Recipient: 'SANDEEP', Note: 'Bike Servicing').
3. Default missing credit or debit amounts to 0.0.
4. Ensure 'type' is strictly either 'DEBIT' or 'CREDIT'.
"""


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT,
                recipient_or_sender TEXT,
                particulars_note TEXT,
                debit_amount REAL DEFAULT 0.0,
                credit_amount REAL DEFAULT 0.0,
                type TEXT,
                category TEXT,
                file_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """
        )
        conn.commit()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def register_user(username: str, password_hash: str) -> bool:
    try:
        with get_db_connection() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, password_hash),
            )
            conn.commit()
            return True
    except sqlite3.IntegrityError:
        return False


def authenticate_user(username: str, password_hash: str) -> Optional[int]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM users WHERE username = ? AND password_hash = ?",
            (username, password_hash),
        )
        row = cursor.fetchone()
        return row["id"] if row else None


def save_user_file(file: Any, username: str) -> str:
    user_folder = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_folder, exist_ok=True)
    file_path = os.path.join(user_folder, file.name)
    with open(file_path, "wb") as f:
        f.write(file.getvalue())
    return file_path


def save_transactions_to_db(
    user_id: int, transactions: List[Dict[str, Any]], file_path: str
) -> None:
    with get_db_connection() as conn:
        for tx in transactions:
            conn.execute(
                """
                INSERT INTO transactions (
                    user_id, date, recipient_or_sender, particulars_note,
                    debit_amount, credit_amount, type, category, file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    str(tx.get("date", "")),
                    str(tx.get("recipient_or_sender", "")),
                    str(tx.get("particulars_note", "")),
                    float(tx.get("debit_amount", 0.0)),
                    float(tx.get("credit_amount", 0.0)),
                    str(tx.get("type", "DEBIT")),
                    str(tx.get("category", "Others")),
                    file_path,
                ),
            )
        conn.commit()


def load_user_transactions(user_id: int) -> pd.DataFrame:
    with get_db_connection() as conn:
        df = pd.read_sql_query(
            "SELECT date, recipient_or_sender, particulars_note, debit_amount, credit_amount, type, category, file_path FROM transactions WHERE user_id = ? ORDER BY date DESC",
            conn,
            params=(user_id,),
        )
    return process_dataframe(df.to_dict(orient="records"))


def parse_statement(
    client: genai.Client, file_bytes: bytes, mime_type: str
) -> List[Dict[str, Any]]:
    part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[part, PROMPT_TEXT],
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        ),
    )
    raw_text = response.text or "[]"
    parsed_data: List[Dict[str, Any]] = json.loads(raw_text)
    return parsed_data


def process_dataframe(data: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(data)
    if df.empty:
        return pd.DataFrame(
            columns=[
                "date",
                "recipient_or_sender",
                "particulars_note",
                "debit_amount",
                "credit_amount",
                "type",
                "category",
                "file_path",
            ]
        )

    expected_cols = [
        "date",
        "recipient_or_sender",
        "particulars_note",
        "debit_amount",
        "credit_amount",
        "type",
        "category",
        "file_path",
    ]
    for col in expected_cols:
        if col not in df.columns:
            df[col] = 0.0 if "amount" in col else ""

    df["debit_amount"] = pd.to_numeric(df["debit_amount"], errors="coerce").fillna(0.0)
    df["credit_amount"] = pd.to_numeric(df["credit_amount"], errors="coerce").fillna(0.0)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    return df


def render_auth_page() -> None:
    st.markdown("<h2 style='text-align: center;'>💡 Kharach AI</h2>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center;'>Sign in to manage your expense statements</p>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        tab_login, tab_signup = st.tabs(["Sign In", "Sign Up"])

        with tab_login:
            login_username = st.text_input("Username", key="login_user")
            login_password = st.text_input("Password", type="password", key="login_pass")
            if st.button("Sign In", type="primary", use_container_width=True):
                user_id = authenticate_user(login_username, hash_password(login_password))
                if user_id:
                    st.session_state["authenticated"] = True
                    st.session_state["user_id"] = user_id
                    st.session_state["current_user"] = login_username
                    st.rerun()
                else:
                    st.error("Invalid username or password.")

        with tab_signup:
            signup_username = st.text_input("Username", key="signup_user")
            signup_password = st.text_input("Password", type="password", key="signup_pass")
            signup_confirm = st.text_input("Confirm Password", type="password", key="signup_conf")
            if st.button("Sign Up", use_container_width=True):
                if not signup_username or not signup_password:
                    st.error("Username and password cannot be empty.")
                elif signup_password != signup_confirm:
                    st.error("Passwords do not match.")
                else:
                    success = register_user(signup_username, hash_password(signup_password))
                    if success:
                        st.success("Account created successfully! Please Sign In.")
                    else:
                        st.error("Username already exists.")


def render_dashboard(client: genai.Client) -> None:
    current_user = st.session_state.get("current_user", "User")
    user_id = st.session_state.get("user_id")

    st.sidebar.markdown(f"👤 **Logged in as:** `{current_user}`")
    if st.sidebar.button("Logout", type="secondary"):
        st.session_state["authenticated"] = False
        st.session_state.pop("current_user", None)
        st.session_state.pop("user_id", None)
        st.rerun()

    st.title("💡 Kharach AI — Smart Expense & Statement Tracker")

    st.subheader("1. Upload Bank Statement")
    uploaded_files = st.file_uploader(
        "Upload PDF or Image Bank Statements",
        type=["pdf", "png", "jpg", "jpeg", "mp4", "mov"],
        accept_multiple_files=True,
    )

    if uploaded_files:
        for file in uploaded_files:
            if file.type.startswith("image/"):
                st.image(file, caption=file.name, width=250)
            else:
                st.info(f"📄 Document Loaded: {file.name}")

    if st.button("Analyze Kharach", type="primary", disabled=not uploaded_files):
        with st.spinner("Saving file and analyzing statement using Gemini 2.5 Flash..."):
            try:
                for file in uploaded_files:
                    saved_path = save_user_file(file, current_user)
                    bytes_data = file.getvalue()
                    mime_type = file.type
                    if mime_type == "application/pdf" or mime_type.startswith("image/"):
                        parsed_txs = parse_statement(client, bytes_data, mime_type)
                        save_transactions_to_db(user_id, parsed_txs, saved_path)
                st.success("Analysis complete and saved to database!")
            except Exception as e:
                st.error(f"Failed to analyze statement: {str(e)}")

    df: pd.DataFrame = load_user_transactions(user_id)

    if not df.empty:
        tab1, tab2, tab3 = st.tabs(
            [
                "📊 Overview & Metrics",
                "📜 Transaction Ledger & Filters",
                "📈 Spending Insights",
            ]
        )

        with tab1:
            total_credited = float(df["credit_amount"].sum())
            total_debited = float(df["debit_amount"].sum())
            net_balance = total_credited - total_debited
            tx_count = len(df)

            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Total Credited", f"₹{total_credited:,.2f}")
            col2.metric("Total Debited", f"₹{total_debited:,.2f}")
            col3.metric("Net Balance", f"₹{net_balance:,.2f}")
            col4.metric("Transactions", f"{tx_count}")

            st.markdown("### 🚨 Large Transactions (> ₹1,000)")
            large_tx = df[(df["debit_amount"] > 1000) | (df["credit_amount"] > 1000)]
            if not large_tx.empty:
                st.dataframe(large_tx, use_container_width=True)
            else:
                st.info("No transactions found above ₹1,000.")

        with tab2:
            st.sidebar.markdown("---")
            st.sidebar.header("Ledger Filters")

            valid_dates = df["date"].dropna()
            if not valid_dates.empty:
                min_d = valid_dates.min().date()
                max_d = valid_dates.max().date()
                date_range = st.sidebar.date_input("Date Range", [min_d, max_d])
            else:
                date_range = []

            tx_type = st.sidebar.multiselect(
                "Transaction Type", options=["DEBIT", "CREDIT"], default=["DEBIT", "CREDIT"]
            )

            categories = list(df["category"].unique())
            selected_cat = st.sidebar.multiselect(
                "Categories", options=categories, default=categories
            )

            search_query = st.sidebar.text_input("Search Recipient / Notes")

            filtered_df = df.copy()
            if len(date_range) == 2:
                start_d, end_d = date_range[0], date_range[1]
                filtered_df = filtered_df[
                    (filtered_df["date"].dt.date >= start_d)
                    & (filtered_df["date"].dt.date <= end_d)
                ]

            if tx_type:
                filtered_df = filtered_df[filtered_df["type"].isin(tx_type)]

            if selected_cat:
                filtered_df = filtered_df[filtered_df["category"].isin(selected_cat)]

            if search_query:
                filtered_df = filtered_df[
                    filtered_df["recipient_or_sender"].astype(str).str.contains(search_query, case=False, na=False)
                    | filtered_df["particulars_note"].astype(str).str.contains(search_query, case=False, na=False)
                ]

            st.dataframe(filtered_df, use_container_width=True)

            csv = filtered_df.to_csv(index=False).encode("utf-8")
            st.download_button(
                label="📥 Download Kharach CSV",
                data=csv,
                file_name="kharach_statement.csv",
                mime="text/csv",
            )

        with tab3:
            st.markdown("### Category Spending Breakdown")
            debit_df = df[df["type"] == "DEBIT"]
            if not debit_df.empty:
                cat_summary = debit_df.groupby("category")["debit_amount"].sum().reset_index()
                st.bar_chart(cat_summary, x="category", y="debit_amount")

                st.markdown("### Top 5 Recipient Transfers")
                top_recipients = (
                    debit_df.groupby("recipient_or_sender")["debit_amount"]
                    .sum()
                    .reset_index()
                    .sort_values(by="debit_amount", ascending=False)
                    .head(5)
                )
                st.dataframe(top_recipients, use_container_width=True)

                st.markdown("### Daily Spending Trend")
                daily_trend = (
                    debit_df.groupby(debit_df["date"].dt.date)["debit_amount"]
                    .sum()
                    .reset_index()
                )
                st.line_chart(daily_trend, x="date", y="debit_amount")
            else:
                st.info("No debit transaction data available for visual analytics.")


def main() -> None:
    init_db()

    if "authenticated" not in st.session_state:
        st.session_state["authenticated"] = False

    if not st.session_state["authenticated"]:
        render_auth_page()
    else:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            st.error("Server Configuration Error: GEMINI_API_KEY environment variable is missing on the server.")
            st.stop()
        client = genai.Client(api_key=api_key)
        render_dashboard(client)


if __name__ == "__main__":
    main()
