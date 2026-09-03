#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const textDir = join(projectRoot, "narration", "text");
const outputDir = join(projectRoot, "narration", "clips");
const voiceId = "RILOU7YmBhvwJGDGjNmP";
const modelId = "eleven_v3";

async function loadApiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  return (await readFile(join(homedir(), ".elevenlabs", "api_key"), "utf8")).trim();
}

const apiKey = await loadApiKey();
if (!apiKey) throw new Error("ElevenLabs API key is not configured.");

await mkdir(outputDir, { recursive: true });
const textFiles = (await readdir(textDir)).filter((name) => name.endsWith(".txt")).sort();

for (const textFile of textFiles) {
  const text = (await readFile(join(textDir, textFile), "utf8")).trim();
  const outputName = `${basename(textFile, ".txt")}.mp3`;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${outputName}: ElevenLabs returned ${response.status}: ${detail}`);
  }

  await writeFile(join(outputDir, outputName), Buffer.from(await response.arrayBuffer()));
  process.stdout.write(`generated ${outputName}\n`);
}
