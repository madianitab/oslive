import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Papel } from './auth.service';

/**
 * Protege uma rota. Sem papéis: basta estar logado.
 * Com papéis: exige um deles (ex.: exigirLogin('admin')).
 */
export function exigirLogin(...papeis: Papel[]): CanActivateFn {
  return async (_rota, estado) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.configurado) return router.createUrlTree(['/entrar']);

    try {
      await auth.iniciar();
    } catch {
      // servidor de login sem resposta: a página de login explica e oferece nova tentativa
      return router.createUrlTree(['/entrar'], { queryParams: { retorno: estado.url } });
    }
    if (!auth.usuario()) {
      return router.createUrlTree(['/entrar'], { queryParams: { retorno: estado.url } });
    }
    const papel = auth.papel();
    if (papeis.length && (!papel || !papeis.includes(papel))) {
      return router.createUrlTree(['/avaliacoes']);
    }
    return true;
  };
}
