import { getMeAPI } from "./auth";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    await getMeAPI();
    return fetch(input, init);
}
