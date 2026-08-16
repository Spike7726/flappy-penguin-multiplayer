import { joinGame } from "../network";

const overlay = document.getElementById("name-overlay") as HTMLDivElement;
const input = document.getElementById("name-input") as HTMLInputElement;
const button = document.getElementById("start-button") as HTMLButtonElement;
const errorText = document.getElementById("name-error") as HTMLParagraphElement;

let prevName = "";

export function promptName(): Promise<string> {
  return new Promise((resolve) => {
    overlay.style.display = "flex";
    input.value = prevName;
    errorText.textContent = "";
    input.focus();

    const attemptJoin = async () => {
      const name = input.value.trim();
      if (!name) {
        errorText.textContent = "Please enter a name";
        return;
      }

      button.disabled = true;
      const result = await joinGame(name);
      button.disabled = false;

      if (result.success) {
        prevName = name;
        overlay.style.display = "none";
        resolve(name);
      } else {
        errorText.textContent = result.reason ?? "Could not join";
      }
    };

    button.onclick = attemptJoin;
    input.onkeydown = (e) => {
      if (e.key === "Enter") attemptJoin();
    };
  });
}