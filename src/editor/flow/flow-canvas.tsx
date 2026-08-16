"use client";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import { AlertCircle, HelpCircle, LayoutGrid, ListTree, Split, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { lintFunnel } from "@/funnel/logic/lint";
import { walkBlocks } from "@/funnel/schema/block";
import type { Condition } from "@/funnel/schema/common";
import { cn } from "@/lib/cn";

import { useDocument, useEditor, useEditorStore } from "../editor-context";
import { FieldsPanel } from "./fields-panel";
import { FlowLegend } from "./flow-legend";
import { autoLayout, buildGraph, stepsSemPosicao, type FlowEdgeData, type StepNodeData } from "./graph";
import { RuleEditor } from "./rule-editor";
import { StepNode } from "./step-node";
import { usePersonalizeWithAi } from "./use-personalize-with-ai";

import "@xyflow/react/dist/style.css";
import "./flow.css";

const nodeTypes = { step: StepNode };
const CHAVE_LEGENDA_FECHADA = "fl-legenda-fechada";

/** Ramificação em edição: nova (sem ruleId) ou existente. */
type EdicaoDeRegra = {
  fromStepId: string;
  toStepId: string;
  ruleId?: string;
  condicao?: Condition;
};

export function FlowCanvas({ onAbrirTela }: { onAbrirTela: (stepId: string) => void }) {
  return (
    <ReactFlowProvider>
      <FlowInterno onAbrirTela={onAbrirTela} />
    </ReactFlowProvider>
  );
}

function FlowInterno({ onAbrirTela }: { onAbrirTela: (stepId: string) => void }) {
  const doc = useDocument();
  const store = useEditorStore();
  const dispatch = useEditor((s) => s.dispatch);
  const selectedStepId = useEditor((s) => s.selectedStepId);
  const selectStep = useEditor((s) => s.selectStep);

  const { fitView } = useReactFlow();
  const [edicao, setEdicao] = useState<EdicaoDeRegra | null>(null);
  // Legenda e painel de campos dividem o mesmo canto — só um por vez, senão
  // um cobre o outro.
  const [painelAberto, setPainelAberto] = useState<"legenda" | "campos" | null>("legenda");

  // Só por clique, não por hover: destacar ao passar o mouse parecia bug em
  // mapas densos — mover o cursor entre cards próximos troca o card em foco a
  // cada pixel, e todo o resto do mapa pisca opacidade a cada troca.
  const [focoId, setFocoId] = useState<string | null>(null);

  useEffect(() => {
    const fechada = window.localStorage.getItem(CHAVE_LEGENDA_FECHADA);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de estado externo (localStorage)
    if (fechada === "1") setPainelAberto(null);
  }, []);

  const { personalizar, stepAtivo: stepPersonalizando, erro: erroPersonalizar } = usePersonalizeWithAi();

  const onFocarIa = useCallback((stepId: string) => personalizar(stepId), [personalizar]);

  const grafo = useMemo(
    () => buildGraph(doc, onAbrirTela, onFocarIa, stepPersonalizando),
    [doc, onAbrirTela, onFocarIa, stepPersonalizando],
  );
  const problemas = useMemo(() => lintFunnel(doc), [doc]);

  /** Tudo que está diretamente ligado ao card em foco — o resto do mapa esmaece. */
  const conectados = useMemo(() => {
    if (!focoId) return null;

    const nodeIds = new Set([focoId]);
    const edgeIds = new Set<string>();

    for (const edge of grafo.edges) {
      if (edge.source === focoId || edge.target === focoId) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
    }

    return { nodeIds, edgeIds };
  }, [focoId, grafo.edges]);

  /**
   * Telas sem posição — recém-criadas, ou vindas da IA — recebem layout
   * automático. Só as que faltam: reorganizar o mapa inteiro moveria os nós que
   * a pessoa já arrumou.
   *
   * Debatido: a IA cria uma ramificação em várias chamadas seguidas (uma
   * `add_step` por ramo), e cada chamada muda o documento na hora — sem
   * espera, este efeito rodava uma vez por chamada, cada vez com o `dagre`
   * enxergando um pedaço diferente do grafo. Dois ramos irmãos criados a
   * poucos milissegundos de distância podiam sair de rodadas diferentes do
   * layout, cada uma calculada sem saber da outra, e acabar na mesma posição.
   * Esperar a rajada assentar faz o `dagre` ver todos os ramos novos de uma
   * vez e distribuí-los sem sobrepor.
   */
  useEffect(() => {
    const temporizador = setTimeout(() => {
      const docAtual = store.getState().doc;
      const faltando = stepsSemPosicao(docAtual);
      if (faltando.length === 0) return;

      const posicoes = autoLayout(buildGraph(docAtual));

      for (const stepId of faltando) {
        const posicao = posicoes[stepId];
        if (posicao) {
          store.getState().dispatch(
            { type: "set_flow_position", stepId, x: posicao.x, y: posicao.y },
            { label: "Organizar fluxo", mergeKey: "flow:layout", mergeWindowMs: Infinity, skipHistory: true },
          );
        }
      }
    }, 500);

    return () => clearTimeout(temporizador);
  }, [doc, store]);

  const nodesFromDoc: Node[] = useMemo(
    () =>
      grafo.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedStepId,
        draggable: true,
        className: conectados && !conectados.nodeIds.has(node.id) ? "fl-node-wrap--dim" : undefined,
      })),
    [grafo.nodes, selectedStepId, conectados],
  );

  /**
   * Buffer local para o arraste ficar fluido.
   *
   * `nodes` é controlado (vem do documento via `nodesFromDoc`), e o React Flow
   * só anima a posição em tempo real se o array que ele recebe mudar a cada
   * quadro do gesto. Sem isto, `onNodesChange` só grava no documento quando o
   * arraste termina — e como nada mais atualizava `nodes` nesse meio tempo, o
   * card ficava visualmente travado na posição antiga até soltar o clique.
   *
   * `nodesFromDoc` ainda é a fonte da verdade: sempre que o documento muda de
   * verdade (edição da IA, undo, `set_flow_position` gravado), o buffer precisa
   * resincronizar — sem isso, edições externas nunca apareceriam. Ajustado
   * durante a renderização, não num efeito: um efeito rodaria um quadro depois,
   * e o card piscaria na posição antiga antes de corrigir.
   */
  const [nodes, setNodes] = useState<Node[]>(nodesFromDoc);
  const [nodesFromDocSincronizados, setNodesFromDocSincronizados] = useState(nodesFromDoc);

  if (nodesFromDoc !== nodesFromDocSincronizados) {
    setNodesFromDocSincronizados(nodesFromDoc);
    setNodes(nodesFromDoc);
  }

  const edges: Edge[] = useMemo(
    () =>
      grafo.edges.map((edge) => ({
        ...edge,
        type: "smoothstep",
        animated: edge.data.kind === "regra",
        className: cn(
          `fl-edge fl-edge--${edge.data.kind}`,
          conectados && !conectados.edgeIds.has(edge.id) && "fl-edge--dim",
        ),
        style: edge.data.cor ? { stroke: edge.data.cor } : undefined,
        markerEnd: {
          type: "arrowclosed" as const,
          width: 16,
          height: 16,
          ...(edge.data.cor ? { color: edge.data.cor } : {}),
        },
      })),
    [grafo.edges, conectados],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Aplica todo quadro do gesto no buffer local — é isso que faz o
      // arraste deslizar junto com o cursor.
      setNodes((atual) => applyNodeChanges(changes, atual));

      for (const change of changes) {
        // Só grava no documento quando o arraste termina: gravar a cada
        // quadro encheria o histórico de undo com dezenas de passos de um
        // movimento só.
        if (change.type === "position" && change.dragging === false && change.position) {
          dispatch(
            {
              type: "set_flow_position",
              stepId: change.id,
              x: change.position.x,
              y: change.position.y,
            },
            { label: "Mover no fluxo" },
          );
        }
      }
    },
    [dispatch],
  );

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;

    setEdicao({ fromStepId: connection.source, toStepId: connection.target });
  }, []);

  const onEdgeClick: EdgeMouseHandler = useCallback((_evento, edge) => {
    const data = edge.data as FlowEdgeData | undefined;
    if (data?.kind !== "regra" || !data.ruleId) return;

    setEdicao({
      fromStepId: data.fromStepId,
      toStepId: edge.target,
      ruleId: data.ruleId,
      condicao: condicaoDaRegra(store.getState().doc, data.fromStepId, data.ruleId),
    });
  }, [store]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evento, node) => {
      selectStep(node.id);
      setFocoId((atual) => (atual === node.id ? null : node.id));
    },
    [selectStep],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_evento, node) => onAbrirTela(node.id),
    [onAbrirTela],
  );

  const onPaneClick = useCallback(() => setFocoId(null), []);

  const alternarLegenda = useCallback(() => {
    setPainelAberto((atual) => {
      const abrindo = atual !== "legenda";
      window.localStorage.setItem(CHAVE_LEGENDA_FECHADA, abrindo ? "0" : "1");
      return abrindo ? "legenda" : null;
    });
  }, []);

  const alternarCampos = useCallback(() => {
    setPainelAberto((atual) => (atual === "campos" ? null : "campos"));
  }, []);

  /** Recalcula a posição de todas as telas — o "arrumar a mesa" do mapa. */
  const reorganizar = useCallback(() => {
    const documento = store.getState().doc;
    const posicoes = autoLayout(buildGraph(documento));

    store.getState().dispatchMany(
      Object.entries(posicoes).map(([stepId, posicao]) => ({
        type: "set_flow_position" as const,
        stepId,
        x: posicao.x,
        y: posicao.y,
      })),
      { label: "Reorganizar fluxo" },
    );

    // Reorganizar sem reenquadrar deixa o mapa arrumado fora da vista.
    requestAnimationFrame(() => fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1, duration: 300 }));
  }, [fitView, store]);

  function salvarRegra(condicao: Condition) {
    if (!edicao) return;

    if (edicao.ruleId) {
      dispatch(
        {
          type: "update_rule",
          stepId: edicao.fromStepId,
          ruleId: edicao.ruleId,
          patch: { when: condicao, goto: edicao.toStepId },
        },
        { label: "Editar ramificação" },
      );
    } else {
      dispatch(
        {
          type: "add_rule",
          stepId: edicao.fromStepId,
          rule: { id: `regra_${Date.now().toString(36)}`, when: condicao, goto: edicao.toStepId },
        },
        { label: "Criar ramificação" },
      );
    }

    setEdicao(null);
  }

  const erros = problemas.filter((p) => p.severity === "erro");

  return (
    <div className="fl-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        fitView
        /**
         * O piso de zoom é o que importa aqui. Um funil de 12 telas em linha
         * mede uns 4000px; enquadrá-lo inteiro numa janela de 700px deixaria os
         * cards em 0,17 de escala, ilegíveis. Melhor abrir num tamanho que dá
         * para ler, mostrando o começo, e deixar a pessoa navegar.
         */
        fitViewOptions={{ padding: 0.2, minZoom: 0.55, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        minZoom={0.2}
        maxZoom={1.6}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} className="fl-bg" />
        <Controls showInteractive={false} className="fl-controls" />
        {/*
          O tamanho tem que vir por `style`, não só por CSS: o MiniMap lê
          `style.width`/`style.height` (não a caixa renderizada do DOM) para
          calcular o próprio viewBox interno. Só com className, o SVG
          continuava nascendo no tamanho padrão da biblioteca e a div
          cortava o excesso — por isso o mapa parecia fora de centro. Também
          mais largo que alto de propósito: um funil é uma cadeia comprida,
          então o desenho real é bem mais largo que alto, e um viewBox
          quadrado sobra muito espaço vazio em cima e embaixo.
        */}
        <MiniMap pannable zoomable className="fl-minimap" style={{ width: 220, height: 100 }} />
      </ReactFlow>

      <BarraDeAcoes
        onRamificar={() => setEdicao(null)}
        onReorganizar={reorganizar}
        onAlternarLegenda={alternarLegenda}
        onAlternarCampos={alternarCampos}
      />

      <FlowLegend aberta={painelAberto === "legenda"} onFechar={() => setPainelAberto(null)} />
      <FieldsPanel aberto={painelAberto === "campos"} onFechar={() => setPainelAberto(null)} />

      {erros.length > 0 && (
        <div className="fl-alertas" role="status">
          <AlertCircle size={13} />
          {erros.length === 1 ? "1 problema no fluxo" : `${erros.length} problemas no fluxo`}
        </div>
      )}

      {erroPersonalizar && (
        <div className="fl-erro-ia" role="alert">
          <AlertCircle size={13} />
          {erroPersonalizar}
        </div>
      )}

      {edicao && (
        <div className="fl-overlay" onClick={() => setEdicao(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <RuleEditor
              doc={doc}
              fromStepId={edicao.fromStepId}
              toStepId={edicao.toStepId}
              condicaoInicial={edicao.condicao}
              onSalvar={salvarRegra}
              onCancelar={() => setEdicao(null)}
              onRemover={
                edicao.ruleId
                  ? () => {
                      dispatch(
                        { type: "remove_rule", stepId: edicao.fromStepId, ruleId: edicao.ruleId! },
                        { label: "Remover ramificação" },
                      );
                      setEdicao(null);
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Atalho de ramificar por resposta.
 *
 * Gera uma regra por opção da pergunta selecionada, apontando cada uma para uma
 * tela nova. É o caminho de dois cliques para o caso "qual pet você tem?" virar
 * três caminhos de verdade.
 */
function BarraDeAcoes({
  onRamificar,
  onReorganizar,
  onAlternarLegenda,
  onAlternarCampos,
}: {
  onRamificar: () => void;
  onReorganizar: () => void;
  onAlternarLegenda: () => void;
  onAlternarCampos: () => void;
}) {
  const doc = useDocument();
  const store = useEditorStore();
  const selectedStepId = useEditor((s) => s.selectedStepId);

  const step = doc.steps.find((s) => s.id === selectedStepId);
  const escolha = step ? primeiroBlocoDeEscolha(step) : null;
  const jaRamificada = (step?.logic.rules.length ?? 0) > 0;

  function ramificar() {
    if (!step || !escolha) return;

    const estado = store.getState();
    const documento = estado.doc;

    // Para onde os ramos convergem: o que vinha depois da pergunta. Sem isso,
    // as telas dos ramos ficam em sequência na lista e quem entra no primeiro
    // caminho acaba caindo dentro do segundo.
    const indice = documento.steps.findIndex((s) => s.id === step.id);
    const convergencia = documento.steps[indice + 1]?.id;

    const branches: { optionId: string; goto: string }[] = [];
    const ops: Parameters<typeof estado.dispatchMany>[0] = [];

    let anterior = step.id;

    for (const opcao of escolha.props.options) {
      const idDaTela = `step_${escolha.props.name}_${opcao.id}`.slice(0, 60);

      ops.push({
        type: "add_step",
        step: {
          id: idDaTela,
          name: opcao.label,
          type: "content",
          layout: { align: "center", fullHeight: true },
          blocks: [
            {
              id: `blk_${opcao.id}_titulo`.slice(0, 60),
              type: "heading",
              props: { text: opcao.label, level: 1 },
            },
          ],
          // Sem convergência (a pergunta era a última tela), o ramo encerra.
          logic: convergencia ? { rules: [], next: convergencia } : { rules: [], isEnd: true },
        },
        afterStepId: anterior,
      });

      branches.push({ optionId: opcao.id, goto: idDaTela });
      anterior = idDaTela;
    }

    ops.push({ type: "branch_by_answer", stepId: step.id, blockId: escolha.id, branches, replace: true });

    estado.dispatchMany(ops, { label: "Ramificar por resposta" });
    onRamificar();
  }

  return (
    <div className="fl-acoes">
      {step && escolha && (
        <button type="button" className="fl-acao" onClick={ramificar} disabled={jaRamificada}>
          {jaRamificada ? <Split size={14} /> : <Wand2 size={14} />}
          {jaRamificada ? `"${step.name}" já ramifica` : `Ramificar "${step.name}" por resposta`}
        </button>
      )}

      <button type="button" className="fl-acao" onClick={onReorganizar}>
        <LayoutGrid size={14} />
        Reorganizar
      </button>

      <button type="button" className="fl-acao" onClick={onAlternarCampos}>
        <ListTree size={14} />
        Campos
      </button>

      <button type="button" className="fl-acao" aria-label="Legenda do mapa" onClick={onAlternarLegenda}>
        <HelpCircle size={14} />
      </button>
    </div>
  );
}

function primeiroBlocoDeEscolha(step: { blocks: StepNodeData["step"]["blocks"] }) {
  for (const block of walkBlocks(step.blocks)) {
    if (block.type === "choice") return block;
  }
  return null;
}

function condicaoDaRegra(
  doc: ReturnType<typeof useDocument>,
  stepId: string,
  ruleId: string,
): Condition | undefined {
  const step = doc.steps.find((s) => s.id === stepId);
  return step?.logic.rules.find((r) => r.id === ruleId)?.when;
}
