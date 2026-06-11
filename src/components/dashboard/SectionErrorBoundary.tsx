import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * ErrorBoundary local — isola crashes em sub-árvores específicas
 * (ex: HostTable / busca) sem derrubar o dashboard inteiro.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SectionErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {this.props.fallbackTitle ?? "Algo deu errado neste painel."}
          </div>
          {this.state.message && (
            <p className="mt-2 text-xs text-muted-foreground">{this.state.message}</p>
          )}
          <button
            onClick={this.reset}
            className="mt-3 rounded-md border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
