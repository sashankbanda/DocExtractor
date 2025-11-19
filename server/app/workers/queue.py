from asyncio import Queue

job_queue: Queue[str] = Queue()


async def enqueue(file_id: str):
    await job_queue.put(file_id)


async def dequeue() -> str:
    return await job_queue.get()

