# TASK SPECIFICATION: "Kharach AI" - Smart Expense & Statement Analyzer App

## App Name
**Kharach AI**

## Goal
Build a full-featured, single-page Streamlit Python application named "Kharach AI" that allows users to upload bank statement files (PDFs, screenshots, or PNG/JPG images). The application uses the Google Gemini API (`google-genai` SDK) to perform OCR, parse line-item transactions, extract transfer recipients and personal notes (e.g., 'petrol', 'rent', 'sadi', 'bike servicing'), categorize expenses, and visualize spending analytics.

---

## 1. Tech Stack Requirements
* **Python Version:** 3.10+
* **Frontend / Dashboard Framework:** Streamlit (`streamlit`)
* **Data Processing & Manipulation:** Pandas (`pandas`)
* **AI / Multimodal LLM SDK:** Google GenAI SDK (`google-genai`)
* **Model:** `gemini-2.5-flash`

---

## 2. Environment & Configuration
1. **Header & Branding:** Display "💡 Kharach AI — Smart Expense & Statement Tracker" at the top of the app.
2. **API Key Input:** Provide a sidebar text input for the `GEMINI_API_KEY` (masked type `"password"`). Also support fallback reading from `os.environ.get("GEMINI_API_KEY")`.
3. **Client Initialization:** Initialize `genai.Client(api_key=api_key)`. Display a user-friendly warning if no API key is set.

---

## 3. UI/UX Workflow & Features

### A. File Upload Section
* Support file formats: `.pdf`, `.png`, `.jpg`, `.jpeg`.
* Allow single/multi-page statement uploads.
* Display preview thumbnails for uploaded images or upload confirmation for PDFs.

### B. Analysis Trigger
* Include a prominent **"Analyze Kharach"** button.
* Display an active spinner / status animation while Gemini parses the statement.

### C. Data Extraction Schema (Strict JSON Output)
Instruct Gemini to parse the document/image into a strict JSON list of objects matching this exact structure:

```json
[
  {
    "date": "YYYY-MM-DD",
    "recipient_or_sender": "Name or Merchant extracted from Particulars",
    "particulars_note": "Specific transaction notes (e.g., 'petrol', 'rent', 'bike servicing', 'jagga la pathavle')",
    "debit_amount": 0.0,
    "credit_amount": 0.0,
    "type": "DEBIT" | "CREDIT",
    "category": "Fuel" | "Rent/Housing" | "Shopping" | "ATM/Cash" | "Food/Groceries" | "EMIs/Loans" | "Transfers/Personal" | "Income" | "Bills/Recharge" | "Others"
  }
]


### D. Analytics & Dashboard Layout

Once parsed, render the results using Streamlit tabs:

1. **Tab 1: Kharach Overview & Metrics**
* KPI Cards: Total Credited (₹), Total Debited (₹), Net Balance (₹), Total Transaction Count.
* Large Transaction Highlights: Table showing all individual credits or debits > ₹1,000.


2. **Tab 2: Transaction Ledger & Filters**
* Clean `st.dataframe` displaying date, recipient, notes, debit/credit amounts, and category.
* Sidebar Filters: Date Range, Transaction Type (Debit/Credit), Category dropdown, and Search box for recipient name/notes.
* Export option: **"Download Kharach CSV"** button (`st.download_button`).


3. **Tab 3: Visual Analytics & Spending Insights**
* Category Spending Breakdown (Bar / Donut Chart).
* Top 5 Recipient Transfers (Highlighting who received the most money).
* Daily Spending Trend line chart.



---

## 4. Statement Parsing Rules for Gemini

Ensure the prompt passed to `client.models.generate_content` instructs Gemini on these specific details:

1. **Page Break / Incomplete Entries:** Gracefully handle split lines across page margins or missing columns.
2. **UPI Note Extraction:** Clean messy UPI handles into readable names and personal notes (e.g., parse `UPI/DR/657380366355/SANDEEP/SBIN/Bike Servicing` to Recipient: `SANDEEP` and Note: `Bike Servicing`).
3. **Numeric Defaults:** Default missing credit/debit values to `0.0`.

---

## 5. Deployment Files to Generate

Generate all necessary project files ready for Render / Hugging Face Spaces deployment:

1. `app.py`: Main Streamlit application code.
2. `requirements.txt`:
```text
streamlit
pandas
google-genai
Pillow

```


3. `Dockerfile`:
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]

```



Use clean, production-ready Python code adhering to the `google-genai` SDK standards.

```

```