
const porcentagem = document.getElementById("porcentagem");
const barraNivel = document.getElementById("barraNivel");
const descricaoNivel = document.getElementById("descricaoNivel");
const statusNivel = document.getElementById("status");
const mensagem = document.getElementById("mensagem");
const controleNivel = document.getElementById("controleNivel");
const valorControle = document.getElementById("valorControle");
const atualizacao = document.getElementById("atualizacao");

let ultimaSolicitacao = 0;

async function atualizarNivel(nivel) {
    nivel = Math.max(0, Math.min(100, Number(nivel)));

    // Atualiza os controles imediatamente.
    porcentagem.textContent = nivel;
    barraNivel.style.width = `${nivel}%`;
    descricaoNivel.textContent = `${nivel}% da capacidade estimada`;
    controleNivel.value = nivel;
    valorControle.textContent = `${nivel}%`;

    mensagem.textContent = "Consultando o servidor...";
    statusNivel.textContent = "Atualizando";
    statusNivel.className = "status";

    const solicitacaoAtual = ++ultimaSolicitacao;

    try {
        // Envia o nível ao backend.
        const resposta = await fetch("/api/nivel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nivel })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || "Falha na solicitação.");
        }

        // Ignora respostas antigas se o usuário mudou o nível rapidamente.
        if (solicitacaoAtual !== ultimaSolicitacao) {
            return;
        }

        // Mostra a classificação devolvida pelo backend.
        statusNivel.textContent = resultado.status;
        statusNivel.className = "status";

        if (resultado.status === "Nível crítico") {
            statusNivel.classList.add("critico");
        } else if (resultado.status === "Nível baixo") {
            statusNivel.classList.add("baixo");
        } else if (resultado.status === "Atenção ao nível") {
            statusNivel.classList.add("atencao");
        } else {
            statusNivel.classList.add("adequado");
        }

        mensagem.textContent = resultado.mensagem;

        atualizacao.textContent =
            `Última leitura: ${new Date(resultado.dataHora).toLocaleString("pt-BR")}`;

    } catch (erro) {
        if (solicitacaoAtual !== ultimaSolicitacao) {
            return;
        }

        statusNivel.textContent = "Sem conexão";
        statusNivel.className = "status";
        mensagem.textContent =
            "Não foi possível consultar o backend. Verifique se o servidor está funcionando.";
        atualizacao.textContent = "Falha ao atualizar a leitura.";

        console.error("Erro ao consultar o backend:", erro);
    }
}

// Botões de níveis predefinidos.
document.querySelectorAll("[data-nivel]").forEach((botao) => {
    botao.addEventListener("click", () => {
        atualizarNivel(botao.dataset.nivel);
    });
});

// Controle deslizante.
controleNivel.addEventListener("input", () => {
    atualizarNivel(controleNivel.value);
});

// Primeira leitura simulada.
atualizarNivel(72);

async function atualizarClima() {
    const climaStatus = document.getElementById("climaStatus");
    const temperatura = document.getElementById("climaTemperatura");
    const precipitacao = document.getElementById("climaPrecipitacao");
    const horario = document.getElementById("climaHorario");
    const botao = document.getElementById("atualizarClima");

    climaStatus.textContent = "Consultando dados meteorológicos...";
    botao.disabled = true;

    try {
        const resposta = await fetch("http://localhost:3000/api/clima");
        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Falha ao consultar o clima.");
        }

        temperatura.textContent =
            `${dados.temperatura} ${dados.unidadeTemperatura}`;

        precipitacao.textContent =
            `${dados.precipitacao} ${dados.unidadePrecipitacao}`;

        horario.textContent =
            `Horário informado pela API: ${dados.horario}`;

        climaStatus.textContent =
            `Dados meteorológicos recebidos: ${dados.cidade}`;

    } catch (erro) {
        climaStatus.textContent =
            "Não foi possível carregar o clima. Tente novamente.";

        console.error("Erro ao atualizar clima:", erro);
    } finally {
        botao.disabled = false;
    }
}


const botaoAtualizarClima = document.getElementById("atualizarClima");

if (botaoAtualizarClima) {
    botaoAtualizarClima.addEventListener("click", atualizarClima);
    atualizarClima();
} else {
    console.error(
        'Botão "atualizarClima" não encontrado no HTML.'
    );
}

