import { startGame } from "./game.js"
import { loadLanguage } from "../locales/lang";

const disabledMatches = new Set<string>();

// 토너먼트 설정 페이지
export async function setupTournament()
{
	const contentDiv = document.getElementById("content");
	if (!contentDiv) throw new Error("Error: Cannot find content element!");
	
	contentDiv.innerHTML = `
		<div class="relative flex flex-col items-center h-full">
			<!-- 헤더 -->
			<h2 data-i18n="tournamentsetup" class="text-5xl font-semibold absolute top-3 left-1/2 transform -translate-x-1/2">
			</h2>
			
			<!-- 입력 및 버튼 -->
			<div class="flex flex-col space-y-4 items-center flex-grow justify-center">
				<label data-i18n="numberofplayers" class="text-xl"></label>
				<input type="number" id="player-count" class="p-2 border rounded text-center w-24" min="1" max="8" value="4">
				<button data-i18n="starttournament" id="start-tournament" class="btn bg-purple-500 text-white text-xl py-3 px-6 rounded-lg shadow-lg hover:bg-purple-600 transition duration-300">
				</button>
			</div>
		</div>
	`;

	const currentLang = localStorage.getItem("language") || "en";
        await loadLanguage(currentLang);

	document.getElementById("start-tournament")!.addEventListener("click", () => {
		const playerCount = parseInt((document.getElementById("player-count") as HTMLInputElement).value, 10);
		disabledMatches.clear();
		startTournament(playerCount);
	});
}

// 대진표 구성
function startTournament(playerCount: number)
{
	const totalPlayers = 8;
	let players: string[] = [];

	// 배열에 플레이어 추가 후 셔플
	for (let i = 1; i <= playerCount; i++)
		players.push(`Player ${i}`);
	for (let i = playerCount + 1; i <= totalPlayers; i++)
		players.push(`AI ${i - playerCount}`);
	players = players.sort(() => Math.random() - 0.5);

	// 대진표 트리 생성
	let bracket: string[][] = [];
	while (players.length > 1) {
		bracket.push([...players]);
		let nextRound: string[] = [];
		for (let i = 0; i < players.length / 2; i++) {
			nextRound.push("???");
		}
		players = nextRound;
	}
	bracket.push(["🏆"]);
	renderBracket(bracket);
}

// 대진표 렌더링
function renderBracket(bracket: string[][])
{
	const contentDiv = document.getElementById("content");
	if (!contentDiv)
		throw new Error("Error: Cannot find content element!");

	let bracketHTML = `
		<div class="relative flex flex-col items-center h-full">
			<!-- 헤더 -->
			<h2 data-i18n="tournamentbracket" class="text-5xl font-semibold absolute top-3 left-1/2 transform -translate-x-1/2">
				🏆 Tournament Bracket
			</h2>

			<!-- 대진표 -->
			<div class="flex flex-col space-y-4 items-center flex-grow justify-center">
	`;

	for (let r = bracket.length - 1; r >= 0; r--)
	{
		bracketHTML += `<div class="flex justify-center gap-10 w-full">`;
		for (let i = 0; i < bracket[r].length / 2; i++)
		{
			const matchKey = `${r}-${i}`;
			if (r === bracket.length - 1) {
				bracketHTML += `
					<div class="flex flex-col items-center bg-yellow-300 p-4 rounded-lg shadow-md w-40">
						<span id="winner" class="text-xl font-bold">${bracket[r][i]}</span>
					</div>
				`;
			}
			else {
				const p1 = bracket[r][i * 2] || "???";
				const p2 = bracket[r][i * 2 + 1] || "???";
				const isDisabled = disabledMatches.has(matchKey) ? "disabled" : "";

				bracketHTML += `
					<div class="flex flex-col items-center bg-gray-200 p-4 rounded-lg shadow-md w-40">
						<span class="text-lg font-semibold">${p1}</span>
						<button 
							class="match-btn text-gray-500 hover:text-gray-700 font-bold py-1 px-3 rounded mt-2 my-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							data-round="${r}" data-match="${i}" data-player1="${p1}" data-player2="${p2}" ${isDisabled}>
							<span class="text-2xl">▶</span>
						</button>
						<span class="text-lg font-semibold">${p2}</span>
					</div>
				`;
			}
		}
		bracketHTML += `</div>`;
	}
	bracketHTML += `</div></div>`;
	contentDiv.innerHTML = bracketHTML;

	// 경기 버튼 이벤트 추가
	document.querySelectorAll(".match-btn").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			const target = event.currentTarget as HTMLButtonElement; // 여기서 currentTarget 사용
			const round = parseInt(target.getAttribute("data-round")!, 10);
			const index = parseInt(target.getAttribute("data-match")!, 10);
			const player1 = target.getAttribute("data-player1")!;
			const player2 = target.getAttribute("data-player2")!;
			const matchKey = `${round}-${index}`;
	
			if (player1 === "???" || player2 === "???")
				return;
	
			disabledMatches.add(matchKey);
			target.disabled = true;
			setupGame(player1, player2, bracket, round, index);
		});
	});
}

async function setupGame(player1: string, player2: string, bracket: string[][], round: number, index: number)
{
	let winner = "???";

	// AI vs AI 경기일 경우 랜덤으로 승자 결정
	if (player1.startsWith("AI") && player2.startsWith("AI"))
		winner = Math.random() > 0.5 ? player1 : player2;
	else
		winner = await startGame(player1, player2);

	// 승자를 다음 라운드에 추가
	let nextIndex = Math.floor(index / 2) * 2;
	if (index % 2 === 0)
		bracket[round + 1][nextIndex] = winner;
	else
		bracket[round + 1][nextIndex + 1] = winner;

	renderBracket(bracket);
}
