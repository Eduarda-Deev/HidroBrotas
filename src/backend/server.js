
const express = require("express");
const path = require("path");
const mqtt = require("mqtt");

const app = express();
const PORTA = 3000;

// ========================================
// CONFIGURAÇÃO MQTT
// ========================================

const TOPICO_MQTT = "hidrobotas/projeto-iot-2026/nivel";

let ultimaLeituraIoT = null;

const clienteMQTT = mqtt.connect(
    "mqtt://broker.hivemq.com:1883",
    {
        reconnectPeriod: 5000,
        connectTimeout: 15000
    }
);

clienteMQTT.on("connect", () => {
    console.log("Backend conectado ao broker MQTT.");

    clienteMQTT.subscribe(TOPICO_MQTT, (erro) => {
        if (erro) {
            console.error(
                "Erro ao assinar tópico MQTT:",
                erro.message
            );
        } else {
            console.log("Inscrito no tópico:", TOPICO_MQTT);
        }
    });
});

clienteMQTT.on("message", (topico, mensagemMQTT) => {
    if (topico !== TOPICO_MQTT) {
        return;
    }

    try {
        const dados = JSON.parse(mensagemMQTT.toString());
        const nivel = Number(dados.nivel);

        if (
            !Number.isFinite(nivel) ||
            nivel < 0 ||
            nivel > 100
        ) {
            console.log("Leitura MQTT inválida:", dados);
            return;
        }

        const classificacao = classificarNivel(nivel);

        ultimaLeituraIoT = {
            origem: "ESP32 via MQTT",
            nivel,
            ...classificacao,
            dataHora: new Date().toISOString()
        };

        console.log("Leitura IoT recebida:", ultimaLeituraIoT);
    } catch (erro) {
        console.error(
            "Mensagem MQTT inválida:",
            erro.message
        );
    }
});

clienteMQTT.on("error", (erro) => {
    console.error("Erro na conexão MQTT:", erro.message);
});

// ========================================
// CONFIGURAÇÃO DO EXPRESS
// ========================================

app.use(express.json());

// Registra as requisições recebidas para facilitar
// a identificação de problemas durante os testes.
app.use((req, res, next) => {
    console.log("Requisição recebida:", req.method, req.url);
    next();
});

// Disponibiliza os arquivos do frontend.
app.use(express.static(path.join(__dirname, "../frontend")));

// ========================================
// CLASSIFICAÇÃO DO NÍVEL DE ÁGUA
// ========================================

function classificarNivel(nivel) {
    if (nivel <= 15) {
        return {
            status: "Nível crítico",
            alerta: true,
            mensagem: "Verifique a situação da caixa-d'água."
        };
    }

    if (nivel <= 30) {
        return {
            status: "Nível baixo",
            alerta: true,
            mensagem: "Acompanhe as próximas leituras."
        };
    }

    if (nivel <= 60) {
        return {
            status: "Atenção ao nível",
            alerta: false,
            mensagem: "O nível está na faixa de atenção."
        };
    }

    return {
        status: "Nível adequado",
        alerta: false,
        mensagem: "O nível está dentro da faixa adequada."
    };
}

// ========================================
// ROTA DE TESTE
// ========================================

app.get("/api/teste-rota", (req, res) => {
    console.log("A rota de teste foi acessada!");

    res.json({
        mensagem: "A rota de teste está funcionando!"
    });
});

// ========================================
// STATUS DO SISTEMA
// ========================================

app.get("/api/status", (req, res) => {
    res.json({
        sistema: "HidroBrotas",
        funcionando: true,
        modo: "simulacao",
        mqttConectado: clienteMQTT.connected,
        recebeuLeituraIoT: ultimaLeituraIoT !== null
    });
});

// ========================================
// RECEBIMENTO DO NÍVEL PELO FRONTEND
// ========================================

app.post("/api/nivel", (req, res) => {
    const nivel = req.body.nivel;

    if (
        typeof nivel !== "number" ||
        !Number.isFinite(nivel) ||
        nivel < 0 ||
        nivel > 100
    ) {
        return res.status(400).json({
            erro: "Informe um nível numérico entre 0 e 100."
        });
    }

    const resultado = classificarNivel(nivel);

    res.json({
        nivel,
        ...resultado,
        dataHora: new Date().toISOString()
    });
});

// ========================================
// ÚLTIMA LEITURA RECEBIDA PELO ESP32
// ========================================

app.get("/api/iot/ultimo", (req, res) => {
    if (!ultimaLeituraIoT) {
        return res.status(404).json({
            mensagem: "Nenhuma leitura MQTT recebida ainda."
        });
    }

    res.json(ultimaLeituraIoT);
});

// ========================================
// DADOS METEOROLÓGICOS DE BROTAS
// ========================================

app.get("/api/clima", async (req, res) => {
    try {
        const url =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=-22.28" +
            "&longitude=-48.13" +
            "&current=temperature_2m,precipitation" +
            "&timezone=America%2FSao_Paulo";

        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error(
                "Falha ao consultar a API meteorológica."
            );
        }

        const dados = await resposta.json();

        res.json({
            cidade: "Brotas - SP",
            temperatura: dados.current.temperature_2m,
            precipitacao: dados.current.precipitation,
            horario: dados.current.time,
            unidadeTemperatura:
                dados.current_units.temperature_2m,
            unidadePrecipitacao:
                dados.current_units.precipitation
        });
    } catch (erro) {
        console.error("Erro ao consultar clima:", erro);

        res.status(502).json({
            erro: "Não foi possível consultar os dados meteorológicos."
        });
    }
});

// ========================================
// INICIALIZAÇÃO DO SERVIDOR
// ========================================

app.listen(PORTA, () => {
    console.log(
        `HidroBrotas disponível em http://localhost:${PORTA}`
    );
});
