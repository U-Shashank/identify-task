# Bitespeed Backend Task: Identity Reconciliation

This project implements the backend service for Bitespeed's identity reconciliation task. It provides an `/identify` endpoint to link customer orders based on email and phone numbers, ensuring a personalized customer experience.

## Live Link
The application is deployed and can be accessed here: [Bitespeed Task Live](https://bitespeed-task-production-b967.up.railway.app/)

## Tech Stack

* **Backend Framework:** Node.js, Express, TypeScript
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Containerization:** Docker & Docker Compose

## API Endpoint

### `POST /api/identify`

This endpoint processes incoming customer contact details and consolidates their identity.

* **Request Body:**
    ```json
    {
        "email"?: string,
        "phoneNumber"?: string
    }
    ```
    * At least one of `email` or `phoneNumber` must be provided.

* **Response Body (HTTP 200 OK):**
    ```json
    {
        "contact": {
            "primaryContatctId": number,
            "emails": string[],       // First element is the email of the primary contact
            "phoneNumbers": string[], // First element is the phone number of the primary contact
            "secondaryContactIds": number[] // Array of all Contact IDs that are "secondary" to the primary contact
        }
    }
    ```

## Setup and Running Locally (with Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/U-Shashank/identify-task.git
    cd bitespeed-task
    ```

2.  **Build and Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```

## Testing the Endpoint

You can use `curl` or a tool like Postman/Insomnia to test the `/identify` endpoint.

**Example Request:**

```bash
curl -X POST -H "Content-Type: application/json" -d '{
    "email": "mcfly@hillvalley.edu",
    "phoneNumber": "123456"
}' http://localhost:3000/api/identify
```